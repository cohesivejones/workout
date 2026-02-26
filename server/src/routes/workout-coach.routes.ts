import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth';
import { workoutCoachSessionStore } from '../services/workoutCoachSessionStore';
import { WorkoutCoachGraph } from '../services/workoutCoachGraph';
import logger from '../logger';

const router = Router();

const workoutCoach = new WorkoutCoachGraph(workoutCoachSessionStore);

/**
 * POST /api/workout-coach/start
 * Initialize a new workout coach session
 */
router.post('/start', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const sessionId = uuidv4();

    // Create session in store
    workoutCoachSessionStore.create(sessionId, userId);

    logger.info('Workout coach session started', { sessionId, userId });

    res.json({
      sessionId,
      message: 'Session created',
    });
  } catch (err) {
    logger.error('Failed to start workout coach session', {
      error: err,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to start session' });
  }
});

/**
 * POST /api/workout-coach/respond
 * Submit user response (yes/no) for current workout
 */
router.post('/respond', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId, response } = req.body;

    // Validation
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    if (!response) {
      return res.status(400).json({ error: 'Response is required' });
    }

    if (response !== 'yes' && response !== 'no') {
      return res.status(400).json({ error: 'Response must be "yes" or "no"' });
    }

    // Get session
    const session = workoutCoachSessionStore.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify user owns this session
    if (session.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update session with response and handle via workoutCoach
    if (response === 'no') {
      workoutCoachSessionStore.update(sessionId, {
        userResponse: 'no',
        regenerationCount: session.regenerationCount + 1,
      });
    } else {
      workoutCoachSessionStore.update(sessionId, {
        userResponse: 'yes',
      });
    }

    logger.info('User response recorded', {
      sessionId,
      response,
      userId: req.user!.id,
    });

    // Handle the response (regenerate or save)
    await workoutCoach.handleUserResponse(req.user!.id, sessionId, response);

    res.json({ message: 'Response recorded' });
  } catch (err) {
    logger.error('Failed to record response', {
      error: err,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to record response' });
  }
});

/**
 * GET /api/workout-coach/stream/:sessionId
 * Server-Sent Events stream for workout generation
 */
router.get('/stream/:sessionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Get session
    const session = workoutCoachSessionStore.get(sessionId);
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
    workoutCoachSessionStore.update(sessionId, { sseResponse: res });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    // Generate workout automatically on connection
    workoutCoach.generateWorkout(req.user!.id, sessionId).catch((error) => {
      logger.error('Failed to auto-generate workout on stream connect', {
        error,
        sessionId,
        userId: req.user!.id,
      });
    });

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
    }, 30000); // Every 30 seconds

    // Clean up on close
    req.on('close', () => {
      clearInterval(keepAlive);
      workoutCoachSessionStore.update(sessionId, { sseResponse: undefined });
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
    res.status(500).json({ error: 'Failed to establish connection' });
  }
});

export default router;
