import { Router, Request, Response } from 'express';
import dataSource from '../data-source';
import { Exercise, WorkoutExercise } from '../entities';
import { authenticateToken } from '../middleware/auth';
import { openai } from '../services/openai';
import logger from '../logger';

const router = Router();

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const exerciseRepository = dataSource.getRepository(Exercise);
    const exercises = await exerciseRepository.find({ where: { userId }, order: { name: 'ASC' } });
    res.json(exercises);
  } catch (err) {
    logger.error('Get exercises error', { error: err, userId: req.user?.id });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/recent', authenticateToken, async (req: Request, res: Response) => {
  const { exerciseId } = req.query;
  const userId = req.user!.id;
  if (!exerciseId) return res.status(400).json({ error: 'Exercise ID is required' });

  try {
    const workoutExerciseRepository = dataSource.getRepository(WorkoutExercise);
    const result = await workoutExerciseRepository.query(
      `\n      WITH latest_workout AS (\n        SELECT w.id\n        FROM workouts w\n        JOIN workout_exercises we ON w.id = we.workout_id\n        WHERE we.exercise_id = $1\n        AND w."userId" = $2\n        ORDER BY w.date DESC\n        LIMIT 1\n      )\n      SELECT we.reps, we.weight, we.time_seconds\n      FROM workout_exercises we\n      WHERE we.workout_id = (SELECT id FROM latest_workout)\n      AND we.exercise_id = $1\n    `,
      [Number(exerciseId), Number(userId)]
    );
    if (!result || result.length === 0)
      return res.status(404).json({ error: 'No workout found with this exercise' });
    res.json({
      reps: result[0].reps,
      weight: result[0].weight,
      time_seconds: result[0].time_seconds,
    });
  } catch (err) {
    logger.error('Get recent exercise error', {
      error: err,
      exerciseId: req.query.exerciseId,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.user!.id;
    const exerciseRepository = dataSource.getRepository(Exercise);
    let exercise = await exerciseRepository.findOne({ where: { name, userId } });
    if (!exercise) exercise = exerciseRepository.create({ name, userId });
    await exerciseRepository.save(exercise);
    logger.info('Exercise created/updated', {
      exerciseId: exercise.id,
      name: exercise.name,
      userId: req.user?.id,
    });
    res.json(exercise);
  } catch (err) {
    logger.error('Create exercise error', { error: err, userId: req.user?.id });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const exerciseId = parseInt(req.params.id);
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Exercise name is required' });
    const exerciseRepository = dataSource.getRepository(Exercise);
    const exercise = await exerciseRepository.findOne({ where: { id: exerciseId } });
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });
    exercise.name = name;
    await exerciseRepository.save(exercise);
    logger.info('Exercise updated', {
      exerciseId: exercise.id,
      name: exercise.name,
      userId: req.user?.id,
    });
    res.json(exercise);
  } catch (err) {
    logger.error('Update exercise error', {
      error: err,
      exerciseId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/suggest', authenticateToken, async (req: Request, res: Response) => {
  try {
    const exerciseId = parseInt(req.params.id);
    const userId = req.user!.id;
    const exerciseRepository = dataSource.getRepository(Exercise);
    const exercise = await exerciseRepository.findOne({ where: { id: exerciseId, userId } });

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    // Use OpenAI to suggest improved exercise names
    const systemPrompt = `You are a fitness expert specializing in exercise naming conventions. Your task is to suggest more precise, professional, and standardized names for exercises. Use proper fitness industry terminology and be specific about equipment and variation when applicable.`;

    const userPrompt = `Given the exercise name "${exercise.name}", suggest 3 improved, more professional versions of this name. Consider:
- Proper capitalization
- Equipment specification (Barbell, Dumbbell, Cable, Machine, Bodyweight, etc.)
- Exercise variation details (Incline, Decline, Close Grip, Wide Grip, etc.)
- Common fitness industry naming conventions

Respond with ONLY 3 suggested exercise names, one per line. No numbering, bullets, or extra text.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 100,
    });

    const suggestionsText = response.choices[0].message.content?.trim() || exercise.name;
    const suggestions = suggestionsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 3); // Ensure max 3 suggestions

    // Fallback if OpenAI didn't return enough suggestions
    if (suggestions.length === 0) {
      suggestions.push(exercise.name);
    }

    logger.info('Exercise name suggestions generated via OpenAI', {
      exerciseId: exercise.id,
      originalName: exercise.name,
      suggestions,
      userId,
    });

    res.json({ suggestions });
  } catch (err) {
    logger.error('Suggest exercise name error', {
      error: err,
      exerciseId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/progression', authenticateToken, async (req: Request, res: Response) => {
  try {
    const exerciseId = parseInt(req.params.id);
    const userId = req.user!.id;

    // Verify the exercise exists and belongs to the user
    const exerciseRepository = dataSource.getRepository(Exercise);
    const exercise = await exerciseRepository.findOne({ where: { id: exerciseId, userId } });

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    // Get date range (last year = 365 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 365);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Fetch all workout exercises for this exercise within the date range
    const workoutExercises = await dataSource.manager.query(
      `
      SELECT 
        w.date::text as date,
        we.weight,
        we.reps,
        we.time_seconds,
        we.new_weight,
        we.new_reps,
        we.new_time
      FROM workout_exercises we
      JOIN workouts w ON we.workout_id = w.id
      WHERE we.exercise_id = $1
        AND w."userId" = $2
        AND w.date BETWEEN $3 AND $4
      ORDER BY w.date ASC
      `,
      [exerciseId, userId, startDateStr, endDateStr]
    );

    // Define the type for workout exercise query results
    interface WorkoutExerciseResult {
      date: string;
      weight: number;
      reps: number;
      time_seconds: number;
      new_weight: boolean;
      new_reps: boolean;
      new_time: boolean;
    }

    // Separate weight and reps data
    const weightData = workoutExercises.map((we: WorkoutExerciseResult) => ({
      date: we.date,
      weight: we.weight,
      reps: we.reps,
      newWeight: we.new_weight,
      newReps: we.new_reps,
    }));

    const repsData = workoutExercises.map((we: WorkoutExerciseResult) => ({
      date: we.date,
      reps: we.reps,
      weight: we.weight,
      newReps: we.new_reps,
      newWeight: we.new_weight,
    }));

    logger.info('Exercise progression data fetched', {
      exerciseId,
      exerciseName: exercise.name,
      dataPoints: workoutExercises.length,
      userId,
    });

    res.json({
      exerciseName: exercise.name,
      weightData,
      repsData,
    });
  } catch (err) {
    logger.error('Get exercise progression error', {
      error: err,
      exerciseId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
