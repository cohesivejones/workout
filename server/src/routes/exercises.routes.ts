import { Router, Request, Response } from "express";
import dataSource from "../data-source";
import { Exercise, WorkoutExercise } from "../entities";
import { authenticateToken } from "../middleware/auth";
import logger from "../logger";

const router = Router();

router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const exerciseRepository = dataSource.getRepository(Exercise);
    const exercises = await exerciseRepository.find({ where: { userId }, order: { name: "ASC" } });
    res.json(exercises);
  } catch (err) {
    logger.error("Get exercises error", { error: err, userId: req.user?.id });
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/recent", authenticateToken, async (req: Request, res: Response) => {
  const { exerciseId } = req.query;
  const userId = req.user!.id;
  if (!exerciseId) return res.status(400).json({ error: "Exercise ID is required" });

  try {
    const workoutExerciseRepository = dataSource.getRepository(WorkoutExercise);
    const result = await workoutExerciseRepository.query(
      `\n      WITH latest_workout AS (\n        SELECT w.id\n        FROM workouts w\n        JOIN workout_exercises we ON w.id = we.workout_id\n        WHERE we.exercise_id = $1\n        AND w."userId" = $2\n        ORDER BY w.date DESC\n        LIMIT 1\n      )\n      SELECT we.reps, we.weight, we.time_seconds\n      FROM workout_exercises we\n      WHERE we.workout_id = (SELECT id FROM latest_workout)\n      AND we.exercise_id = $1\n    `,
      [Number(exerciseId), Number(userId)]
    );
    if (!result || result.length === 0) return res.status(404).json({ error: "No workout found with this exercise" });
    res.json({ reps: result[0].reps, weight: result[0].weight, time_seconds: result[0].time_seconds });
  } catch (err) {
    logger.error("Get recent exercise error", { error: err, exerciseId: req.query.exerciseId, userId: req.user?.id });
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.user!.id;
    const exerciseRepository = dataSource.getRepository(Exercise);
    let exercise = await exerciseRepository.findOne({ where: { name, userId } });
    if (!exercise) exercise = exerciseRepository.create({ name, userId });
    await exerciseRepository.save(exercise);
    logger.info("Exercise created/updated", { exerciseId: exercise.id, name: exercise.name, userId: req.user?.id });
    res.json(exercise);
  } catch (err) {
    logger.error("Create exercise error", { error: err, userId: req.user?.id });
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const exerciseId = parseInt(req.params.id);
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Exercise name is required" });
    const exerciseRepository = dataSource.getRepository(Exercise);
    const exercise = await exerciseRepository.findOne({ where: { id: exerciseId } });
    if (!exercise) return res.status(404).json({ error: "Exercise not found" });
    exercise.name = name;
    await exerciseRepository.save(exercise);
    logger.info("Exercise updated", { exerciseId: exercise.id, name: exercise.name, userId: req.user?.id });
    res.json(exercise);
  } catch (err) {
    logger.error("Update exercise error", { error: err, exerciseId: req.params.id, userId: req.user?.id });
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
