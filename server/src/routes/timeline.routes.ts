import { Router, Request, Response } from "express";
import { Between, LessThan } from "typeorm";
import dataSource from "../data-source";
import { Workout, PainScore, SleepScore } from "../entities";
import { authenticateToken } from "../middleware/auth";
import { WorkoutResponse } from "../types";
import logger from "../logger";

const router = Router();

router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    const workoutRepository = dataSource.getRepository(Workout);
    const painScoreRepository = dataSource.getRepository(PainScore);
    const sleepScoreRepository = dataSource.getRepository(SleepScore);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workoutWhere: any = { userId: Number(userId) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const painScoreWhere: any = { userId: Number(userId) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sleepScoreWhere: any = { userId: Number(userId) };

    if (startDate && endDate) {
      const start = startDate as string;
      const end = endDate as string;
      workoutWhere.date = Between(start, end);
      painScoreWhere.date = Between(start, end);
      sleepScoreWhere.date = Between(start, end);
    }

    const [workouts, painScores, sleepScores] = await Promise.all([
      workoutRepository.find({
        where: workoutWhere,
        relations: { workoutExercises: { exercise: true } },
        order: { date: "DESC" },
      }),
      painScoreRepository.find({ where: painScoreWhere, order: { date: "DESC" } }),
      sleepScoreRepository.find({ where: sleepScoreWhere, order: { date: "DESC" } }),
    ]);

    let hasMore = false;
    if (startDate && endDate) {
      const start = startDate as string;
      const [earlierWorkouts, earlierPainScores, earlierSleepScores] = await Promise.all([
        workoutRepository.count({ where: { userId: Number(userId), date: LessThan(start) } }),
        painScoreRepository.count({ where: { userId: Number(userId), date: LessThan(start) } }),
        sleepScoreRepository.count({ where: { userId: Number(userId), date: LessThan(start) } }),
      ]);
      hasMore = earlierWorkouts > 0 || earlierPainScores > 0 || earlierSleepScores > 0;
    }

    const workoutResponses: WorkoutResponse[] = workouts.map((workout) => ({
      id: workout.id,
      date: workout.date,
      withInstructor: workout.withInstructor,
      exercises: workout.workoutExercises.map((we) => ({
        id: we.exercise.id,
        name: we.exercise.name,
        reps: we.reps,
        weight: we.weight,
        time_seconds: we.time_seconds,
        new_reps: we.new_reps,
        new_weight: we.new_weight,
        new_time: we.new_time,
      })),
    }));

    logger.debug("Timeline data fetched", {
      workoutCount: workouts.length,
      painScoreCount: painScores.length,
      sleepScoreCount: sleepScores.length,
      hasMore,
      userId: req.user?.id,
    });

    res.json({ workouts: workoutResponses, painScores, sleepScores, hasMore });
  } catch (err) {
    logger.error("Get timeline error", { error: err, userId: req.user?.id });
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
