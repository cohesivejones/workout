import { Router, Request, Response } from "express";
import dataSource from "../data-source";
import { Exercise, Workout, WorkoutExercise } from "../entities";
import { authenticateToken } from "../middleware/auth";
import { DatabaseError, WorkoutResponse, CreateWorkoutRequest } from "../types";
import logger from "../logger";

const router = Router();

router.get("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const workoutId = parseInt(req.params.id);
    const workout = await dataSource.getRepository(Workout).findOne({
      where: { id: workoutId },
      relations: { workoutExercises: { exercise: true } },
    });
    if (!workout) return res.status(404).json({ error: "Workout not found" });
    const workoutResponse: WorkoutResponse = {
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
    };
    res.json(workoutResponse);
  } catch (err) {
    logger.error("Get workout error", { error: err, workoutId: req.params.id, userId: req.user?.id });
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", authenticateToken, async (req: Request, res: Response) => {
  const queryRunner = dataSource.createQueryRunner();
  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const { date, withInstructor, exercises } = req.body as CreateWorkoutRequest;
    const userId = req.user!.id;
    const workoutRepository = queryRunner.manager.getRepository(Workout);
    const workout = workoutRepository.create({ userId, date, withInstructor: withInstructor || false, workoutExercises: [] });
    await workoutRepository.save(workout);
    const exerciseRepository = queryRunner.manager.getRepository(Exercise);
    const workoutExerciseRepository = queryRunner.manager.getRepository(WorkoutExercise);
    const createdWorkoutExercises: WorkoutExercise[] = [];
    for (const exerciseData of exercises) {
      let exercise = await exerciseRepository.findOne({ where: { name: exerciseData.name, userId } });
      if (!exercise) {
        exercise = exerciseRepository.create({ name: exerciseData.name, userId });
        await exerciseRepository.save(exercise);
      }
      const workoutExercise = workoutExerciseRepository.create({
        workout_id: workout.id,
        exercise_id: exercise.id,
        reps: exerciseData.reps,
        weight: exerciseData.weight || null,
        time_seconds: exerciseData.time_seconds || null,
        workout,
        exercise,
      });
      await workoutExerciseRepository.save(workoutExercise);
      const previousWorkoutExercise = await workoutExerciseRepository.query(
        `\n        SELECT we.reps, we.weight, we.time_seconds\n        FROM workout_exercises we\n        JOIN workouts w ON we.workout_id = w.id\n        WHERE we.exercise_id = $1\n        AND w."userId" = $2\n        AND w.date < $3\n        ORDER BY w.date DESC\n        LIMIT 1\n      `,
        [exercise.id, userId, date]
      );
      if (previousWorkoutExercise.length > 0) {
        workoutExercise.new_reps = workoutExercise.reps !== previousWorkoutExercise[0].reps;
        workoutExercise.new_weight = workoutExercise.weight !== previousWorkoutExercise[0].weight;
        workoutExercise.new_time = workoutExercise.time_seconds !== previousWorkoutExercise[0].time_seconds;
      } else {
        workoutExercise.new_reps = false;
        workoutExercise.new_weight = false;
        workoutExercise.new_time = false;
      }
      await workoutExerciseRepository.save(workoutExercise);
      const reloadedWorkoutExercise = await workoutExerciseRepository.findOne({
        where: { workout_id: workout.id, exercise_id: exercise.id },
        relations: ["exercise"],
      });
      if (reloadedWorkoutExercise) {
        workout.workoutExercises.push(reloadedWorkoutExercise);
        createdWorkoutExercises.push(reloadedWorkoutExercise);
      }
    }
    await queryRunner.commitTransaction();
    const response: WorkoutResponse = {
      id: workout.id,
      date: workout.date,
      withInstructor: workout.withInstructor,
      exercises: createdWorkoutExercises.map((we) => ({
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
    logger.info("Workout created", { workoutId: workout.id, date: workout.date, exerciseCount: exercises.length, userId: req.user?.id });
    res.json(response);
  } catch (err) {
    await queryRunner.rollbackTransaction();
    const error = err as DatabaseError;
    logger.error("Create workout error", { error: err, userId: req.user?.id });
    if (error.code === "23505" && error.constraint === "workouts_date_user_id_key") {
      res.status(400).json({ error: "A workout already exists for this date" });
    } else {
      res.status(500).json({ error: error.message || "Server error" });
    }
  } finally {
    await queryRunner.release();
  }
});

router.put("/:id", authenticateToken, async (req: Request, res: Response) => {
  const queryRunner = dataSource.createQueryRunner();
  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const workoutId = parseInt(req.params.id);
    const { date, withInstructor, exercises } = req.body as CreateWorkoutRequest;
    const workoutRepository = queryRunner.manager.getRepository(Workout);
    const workout = await workoutRepository.findOne({
      where: { id: workoutId },
      loadRelationIds: true,
      relations: { workoutExercises: { exercise: true } },
    });
    if (!workout) return res.status(404).json({ error: "Workout not found" });
    workout.date = date;
    workout.withInstructor = withInstructor || false;
    await workoutRepository.save(workout);
    const workoutExerciseRepository = queryRunner.manager.getRepository(WorkoutExercise);
    await workoutExerciseRepository.delete({ workout_id: workout.id });
    const exerciseRepository = queryRunner.manager.getRepository(Exercise);
    const newWorkoutExercises: WorkoutExercise[] = [];
    for (const exerciseData of exercises) {
      let exercise = await exerciseRepository.findOne({ where: { name: exerciseData.name, userId: workout.userId } });
      if (!exercise) {
        exercise = exerciseRepository.create({ name: exerciseData.name, userId: workout.userId });
        await exerciseRepository.save(exercise);
      }
      const workoutExercise = workoutExerciseRepository.create({
        workout_id: workout.id,
        exercise_id: exercise.id,
        reps: exerciseData.reps,
        weight: exerciseData.weight || null,
        time_seconds: exerciseData.time_seconds || null,
        workout,
        exercise,
      });
      await workoutExerciseRepository.save(workoutExercise);
      const previousWorkoutExercise = await workoutExerciseRepository.query(
        `\n        SELECT we.reps, we.weight, we.time_seconds\n        FROM workout_exercises we\n        JOIN workouts w ON we.workout_id = w.id\n        WHERE we.exercise_id = $1\n        AND w."userId" = $2\n        AND w.date < $3\n        ORDER BY w.date DESC\n        LIMIT 1\n      `,
        [exercise.id, workout.userId, date]
      );
      if (previousWorkoutExercise.length > 0) {
        workoutExercise.new_reps = workoutExercise.reps !== previousWorkoutExercise[0].reps;
        workoutExercise.new_weight = workoutExercise.weight !== previousWorkoutExercise[0].weight;
        workoutExercise.new_time = workoutExercise.time_seconds !== previousWorkoutExercise[0].time_seconds;
      } else {
        workoutExercise.new_reps = false;
        workoutExercise.new_weight = false;
        workoutExercise.new_time = false;
      }
      await workoutExerciseRepository.save(workoutExercise);
      newWorkoutExercises.push(workoutExercise);
    }
    await queryRunner.commitTransaction();
    const response: WorkoutResponse = {
      id: workout.id,
      date: workout.date,
      withInstructor: workout.withInstructor,
      exercises: newWorkoutExercises.map((we) => ({
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
    logger.info("Workout updated", { workoutId: workout.id, date: workout.date, exerciseCount: exercises.length, userId: req.user?.id });
    res.json(response);
  } catch (err) {
    await queryRunner.rollbackTransaction();
    const error = err as DatabaseError;
    logger.error("Update workout error", { error: err, workoutId: req.params.id, userId: req.user?.id });
    if (error.code === "23505" && error.constraint === "workouts_date_key") {
      res.status(400).json({ error: "A workout already exists for this date" });
    } else {
      res.status(500).json({ error: error.message || "Server error" });
    }
  } finally {
    await queryRunner.release();
  }
});

router.delete("/:id", authenticateToken, async (req: Request, res: Response) => {
  const queryRunner = dataSource.createQueryRunner();
  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const workoutId = parseInt(req.params.id);
    const workoutRepository = queryRunner.manager.getRepository(Workout);
    const workout = await workoutRepository.findOne({ where: { id: workoutId } });
    if (!workout) return res.status(404).json({ error: "Workout not found" });
    await workoutRepository.remove(workout);
    await queryRunner.commitTransaction();
    logger.info("Workout deleted", { workoutId, userId: req.user?.id });
    res.json({ id: workoutId });
  } catch (err) {
    await queryRunner.rollbackTransaction();
    const error = err as DatabaseError;
    logger.error("Delete workout error", { error: err, workoutId: req.params.id, userId: req.user?.id });
    res.status(500).json({ error: error.message || "Server error" });
  } finally {
    await queryRunner.release();
  }
});

export default router;
