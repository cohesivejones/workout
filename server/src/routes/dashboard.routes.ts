import { Router, Request, Response } from 'express';
import { Between } from 'typeorm';
import dataSource from '../data-source';
import { Workout, PainScore, SleepScore } from '../entities';
import { authenticateToken } from '../middleware/auth';
import logger from '../logger';

const router = Router();

router.get('/weight-progression', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 84);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const workouts = await dataSource.getRepository(Workout).find({
      where: { userId: Number(userId), date: Between(startDateStr, endDateStr) },
      relations: { workoutExercises: { exercise: true } },
      order: { date: 'ASC' },
    });

    const exerciseProgressionData: Record<
      string,
      Array<{
        date: string;
        weight: number | null;
        reps: number;
        new_reps?: boolean;
        new_weight?: boolean;
      }>
    > = {};

    workouts.forEach((workout) => {
      workout.workoutExercises.forEach((we) => {
        const exerciseName = we.exercise.name;
        if (we.weight === null || we.weight === undefined) return;
        if (!exerciseProgressionData[exerciseName]) exerciseProgressionData[exerciseName] = [];
        exerciseProgressionData[exerciseName].push({
          date: workout.date,
          weight: we.weight,
          reps: we.reps,
          new_reps: we.new_reps,
          new_weight: we.new_weight,
        });
      });
    });

    const result = Object.entries(exerciseProgressionData).map(([name, dataPoints]) => ({
      exerciseName: name,
      dataPoints,
    }));
    res.json(result);
  } catch (err) {
    logger.error('Get weight progression error', { error: err, userId: req.user?.id });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/pain-progression', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 84);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const painScores = await dataSource.getRepository(PainScore).find({
      where: { userId: Number(userId), date: Between(startDateStr, endDateStr) },
      order: { date: 'ASC' },
    });
    const dataPoints = painScores.map((ps) => ({ date: ps.date, score: ps.score }));
    res.json({ dataPoints });
  } catch (err) {
    logger.error('Get pain progression error', { error: err, userId: req.user?.id });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/sleep-progression', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 84);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const sleepScores = await dataSource.getRepository(SleepScore).find({
      where: { userId: Number(userId), date: Between(startDateStr, endDateStr) },
      order: { date: 'ASC' },
    });
    const dataPoints = sleepScores.map((ss) => ({ date: ss.date, score: ss.score }));
    res.json({ dataPoints });
  } catch (err) {
    logger.error('Get sleep progression error', { error: err, userId: req.user?.id });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
