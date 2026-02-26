import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth';
import { insightsSessionStore, WorkoutData } from '../services/insightsSessionStore';
import dataSource from '../data-source';
import logger from '../logger';
import { openai } from '../services/openai';

const router = Router();

// Valid timeframe options
const VALID_TIMEFRAMES = ['7d', '30d', '3m', '6m'];

// Helper to calculate date range from timeframe
function getDateRangeFromTimeframe(timeframe: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (timeframe) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '3m':
      start.setMonth(start.getMonth() - 3);
      break;
    case '6m':
      start.setMonth(start.getMonth() - 6);
      break;
    default:
      start.setDate(start.getDate() - 30); // Default to 30 days
  }

  return { start, end };
}

/**
 * POST /api/workout-insights/ask
 * Initialize a new workout insights session
 */
router.post('/ask', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { question, timeframe } = req.body;
    const userId = req.user!.id;

    // Validation
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (!timeframe || typeof timeframe !== 'string') {
      return res.status(400).json({ error: 'Timeframe is required' });
    }

    if (!VALID_TIMEFRAMES.includes(timeframe)) {
      return res.status(400).json({ error: 'Invalid timeframe format' });
    }

    // Calculate date range
    const { start, end } = getDateRangeFromTimeframe(timeframe);

    // Fetch workouts for the timeframe
    const workouts = await dataSource.query(
      `
      SELECT 
        w.id,
        w.date,
        w."withInstructor",
        json_agg(
          json_build_object(
            'name', e.name,
            'reps', we.reps,
            'weight', we.weight,
            'time_seconds', we.time_seconds
          ) ORDER BY e.name
        ) FILTER (WHERE e.name IS NOT NULL) as exercises
      FROM workouts w
      LEFT JOIN workout_exercises we ON w.id = we.workout_id
      LEFT JOIN exercises e ON we.exercise_id = e.id
      WHERE w."userId" = $1
        AND w.date >= $2
        AND w.date <= $3
      GROUP BY w.id, w.date, w."withInstructor"
      ORDER BY w.date DESC
      `,
      [userId, start.toISOString().split('T')[0], end.toISOString().split('T')[0]]
    );

    // Count unique exercises
    const exerciseSet = new Set<string>();
    workouts.forEach((workout: WorkoutData) => {
      if (workout.exercises) {
        workout.exercises.forEach((ex) => {
          if (ex.name) exerciseSet.add(ex.name);
        });
      }
    });

    // Create session
    const sessionId = uuidv4();
    insightsSessionStore.create(sessionId, userId, {
      question,
      timeframe,
      workoutData: workouts,
    });

    logger.info('Workout insights session started', {
      sessionId,
      userId,
      timeframe,
      workoutCount: workouts.length,
      exerciseCount: exerciseSet.size,
    });

    res.json({
      sessionId,
      dataCount: {
        workouts: workouts.length,
        exercises: exerciseSet.size,
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        },
      },
    });
  } catch (err) {
    logger.error('Failed to start workout insights session', {
      error: err,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      userId: req.user?.id,
    });
    res.status(500).json({
      error: 'Failed to start session',
      details:
        process.env.NODE_ENV === 'test'
          ? err instanceof Error
            ? err.message
            : String(err)
          : undefined,
    });
  }
});

/**
 * GET /api/workout-insights/stream/:sessionId
 * Server-Sent Events stream for AI insights
 */
router.get('/stream/:sessionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Get session
    const session = insightsSessionStore.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify user owns this session
    if (session.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Store response in session for cleanup
    insightsSessionStore.update(sessionId, { sseResponse: res });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    logger.info('SSE: Sent connected message', { sessionId });

    // Format workout data as context
    const workoutContext = formatWorkoutDataForAI(session.workoutData);
    logger.info('Formatted workout context', {
      sessionId,
      contextLength: workoutContext.length,
      workoutCount: session.workoutData.length,
    });

    // Send thinking message
    res.write(`data: ${JSON.stringify({ type: 'thinking' })}\n\n`);
    logger.info('SSE: Sent thinking message', { sessionId });

    // Stream AI response
    logger.info('Initiating OpenAI stream', {
      sessionId,
      question: session.question,
      apiKeyConfigured: !!process.env.OPENAI_API_KEY,
    });

    try {
      const stream = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              "You are a knowledgeable workout analysis assistant. Analyze the workout data provided and answer the user's question with helpful insights. Be specific, use data from their workouts, and provide actionable advice.",
          },
          {
            role: 'user',
            content: `Workout History:\n${workoutContext}\n\nQuestion: ${session.question}`,
          },
        ],
        stream: true,
        temperature: 0.7,
      });

      logger.info('OpenAI stream created successfully', { sessionId });
      let chunkCount = 0;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          chunkCount++;
          res.write(`data: ${JSON.stringify({ type: 'content', chunk: content })}\n\n`);
          if (chunkCount === 1) {
            logger.info('SSE: First content chunk received', { sessionId });
          }
        }
      }

      logger.info('OpenAI stream completed', { sessionId, totalChunks: chunkCount });

      // Send completion message
      res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
      logger.info('SSE: Sent complete message', { sessionId });
    } catch (aiError) {
      logger.error('AI streaming error', {
        error: aiError,
        message: aiError instanceof Error ? aiError.message : String(aiError),
        stack: aiError instanceof Error ? aiError.stack : undefined,
        sessionId,
        userId: req.user!.id,
      });
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI processing failed' })}\n\n`);
    }

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
    }, 30000); // Every 30 seconds

    // Clean up on close
    req.on('close', () => {
      clearInterval(keepAlive);
      insightsSessionStore.update(sessionId, { sseResponse: undefined });
      logger.info('SSE connection closed', { sessionId, userId: req.user!.id });
    });

    logger.info('SSE connection established', {
      sessionId,
      userId: req.user!.id,
    });
  } catch (err) {
    logger.error('Failed to establish SSE connection', {
      error: err,
      userId: req.user?.id,
    });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to establish connection' });
    }
  }
});

// Helper function to format workout data for AI
function formatWorkoutDataForAI(workouts: WorkoutData[]): string {
  if (!workouts || workouts.length === 0) {
    return 'No workout data available for the selected timeframe.';
  }

  const lines: string[] = [];

  workouts.forEach((workout) => {
    const date = new Date(workout.date).toLocaleDateString();
    lines.push(`\nDate: ${date}`);
    if (workout.withInstructor) {
      lines.push('  (With Instructor)');
    }

    if (workout.exercises && Array.isArray(workout.exercises)) {
      workout.exercises.forEach((exercise) => {
        let exerciseLine = `  - ${exercise.name}: ${exercise.reps} reps`;
        if (exercise.weight) {
          exerciseLine += ` @ ${exercise.weight} lbs`;
        }
        if (exercise.time_seconds) {
          exerciseLine += ` (${exercise.time_seconds}s)`;
        }
        lines.push(exerciseLine);
      });
    }
  });

  return lines.join('\n');
}

export default router;
