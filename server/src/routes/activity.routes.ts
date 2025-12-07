import { Router, Request, Response } from 'express';
import dataSource from '../data-source';
import { Workout, PainScore, SleepScore } from '../entities';
import { In } from 'typeorm';
import { authenticateToken } from '../middleware/auth';
import logger from '../logger';
import { WorkoutResponse, PainScoreResponse, SleepScoreResponse } from '../types';

const router = Router();

type FeedType = 'workout' | 'painScore' | 'sleepScore';

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const rawOffset = req.query.offset as string | undefined;
    const monthOffset = Number.isFinite(Number(rawOffset)) ? Math.max(0, Number(rawOffset)) : 0;

    // Get both max date and total count in a single query
    const metadataSql = `
      SELECT MAX(date) AS max_date, COUNT(*) AS total FROM (
        SELECT id, date FROM workouts WHERE "userId" = $1
        UNION ALL
        SELECT id, date FROM pain_scores WHERE "userId" = $1
        UNION ALL
        SELECT id, date FROM sleep_scores WHERE "userId" = $1
      ) AS combined
    `;
    const metadataResult = await dataSource.query(metadataSql, [userId]);
    const maxDateStr = metadataResult[0]?.max_date;
    const total = Number(metadataResult[0]?.total || 0);

    if (!maxDateStr) {
      // No activity at all, return empty
      return res.json({ items: [], total: 0, offset: monthOffset, month: null });
    }

    // Parse the max date to get year/month, then subtract monthOffset
    // maxDateStr could be a Date object or string, normalize it
    const maxDate = typeof maxDateStr === 'string' ? new Date(maxDateStr) : new Date(maxDateStr);
    const targetDate = new Date(maxDate.getFullYear(), maxDate.getMonth() - monthOffset, 1);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1; // 1-12

    // Date range for this month: first day to last day
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const nextMonth = new Date(targetYear, targetMonth, 1);
    const endDate = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

    // Use raw SQL to fetch all items for this month, ordered by date DESC
    const sql = `
      SELECT type, id, date FROM (
        SELECT 'workout' AS type, id, date FROM workouts WHERE "userId" = $1 AND date >= $2 AND date < $3
        UNION ALL
        SELECT 'painScore' AS type, id, date FROM pain_scores WHERE "userId" = $1 AND date >= $2 AND date < $3
        UNION ALL
        SELECT 'sleepScore' AS type, id, date FROM sleep_scores WHERE "userId" = $1 AND date >= $2 AND date < $3
      ) AS combined
      ORDER BY date DESC, id DESC
    `;

    const items: { type: FeedType; id: number; date: string }[] = await dataSource.query(sql, [
      userId,
      startDate,
      endDate,
    ]); // Enrich items so each record matches the same shape used by timeline
    const workoutIds = items.filter((i) => i.type === 'workout').map((i) => i.id);
    const painIds = items.filter((i) => i.type === 'painScore').map((i) => i.id);
    const sleepIds = items.filter((i) => i.type === 'sleepScore').map((i) => i.id);

    const workoutRepository = dataSource.getRepository(Workout);
    const painScoreRepository = dataSource.getRepository(PainScore);
    const sleepScoreRepository = dataSource.getRepository(SleepScore);

    const [workoutsDetailed, painScoresDetailed, sleepScoresDetailed] = await Promise.all([
      workoutIds.length
        ? workoutRepository.find({
            where: { id: In(workoutIds), userId },
            relations: { workoutExercises: { exercise: true } },
          })
        : Promise.resolve([] as Workout[]),
      painIds.length
        ? painScoreRepository.find({ where: { id: In(painIds), userId } })
        : Promise.resolve([] as PainScore[]),
      sleepIds.length
        ? sleepScoreRepository.find({ where: { id: In(sleepIds), userId } })
        : Promise.resolve([] as SleepScore[]),
    ]);

    const workoutMap = new Map<number, WorkoutResponse>();
    for (const w of workoutsDetailed) {
      const wr: WorkoutResponse = {
        id: w.id,
        date: w.date,
        withInstructor: w.withInstructor,
        exercises: w.workoutExercises.map((we) => ({
          id: we.exercise.id,
          name: we.exercise.name,
          reps: we.reps,
          weight: we.weight,
          time_seconds: we.time_seconds,
          new_reps: we.new_reps,
          new_weight: we.new_weight,
          new_time: we.new_time,
        })),
      };
      workoutMap.set(w.id, wr);
    }

    const painMap = new Map<number, PainScoreResponse>();
    for (const p of painScoresDetailed) {
      painMap.set(p.id, {
        id: p.id,
        userId: p.userId,
        date: p.date,
        score: p.score,
        notes: p.notes,
      });
    }

    const sleepMap = new Map<number, SleepScoreResponse>();
    for (const s of sleepScoresDetailed) {
      sleepMap.set(s.id, {
        id: s.id,
        userId: s.userId,
        date: s.date,
        score: s.score,
        notes: s.notes,
      });
    }

    const enrichedItems = items.map((i) => {
      if (i.type === 'workout') {
        return { ...i, workout: workoutMap.get(i.id) };
      }
      if (i.type === 'painScore') {
        return { ...i, painScore: painMap.get(i.id) };
      }
      return { ...i, sleepScore: sleepMap.get(i.id) };
    });

    logger.debug('Activity feed fetched', {
      userId,
      total,
      monthOffset,
      month: `${targetYear}-${String(targetMonth).padStart(2, '0')}`,
      returned: enrichedItems.length,
    });

    return res.json({
      items: enrichedItems,
      total,
      offset: monthOffset,
      month: `${targetYear}-${String(targetMonth).padStart(2, '0')}`,
    });
  } catch (err) {
    logger.error('Get activity feed error', { error: err, userId: req.user?.id });
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
