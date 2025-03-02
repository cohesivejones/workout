import express, { Request, Response } from "express";
import cors from "cors";
import { DatabaseError, WorkoutResponse, CreateWorkoutRequest } from "./types";
import * as dotenv from "dotenv";
import dataSource from "./data-source";
import { Exercise, Workout, WorkoutExercise } from "./entities";
import { In } from "typeorm";

// Initialize reflect-metadata
import "reflect-metadata";

dotenv.config();

// Initialize TypeORM connection
dataSource
  .initialize()
  .then(() => {
    console.log("Data Source has been initialized!");
  })
  .catch((err) => {
    console.error("Error during Data Source initialization:", err);
  });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes

// Get all exercises
app.get("/exercises", async (_req: Request, res: Response) => {
  try {
    const exerciseRepository = dataSource.getRepository(Exercise);
    const exercises = await exerciseRepository.find({
      order: {
        name: "ASC",
      },
    });
    res.json(exercises);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Add new exercise
app.post("/exercises", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const exerciseRepository = dataSource.getRepository(Exercise);

    // Check if exercise exists
    let exercise = await exerciseRepository.findOne({ where: { name } });

    if (!exercise) {
      // Create new exercise
      exercise = exerciseRepository.create({ name });
    }

    // Save exercise (either new or existing)
    await exerciseRepository.save(exercise);
    res.json(exercise);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all workouts with exercises
app.get("/workouts", async (_req: Request, res: Response) => {
  try {
    const workoutRepository = dataSource.getRepository(Workout);

    const workouts = await workoutRepository.find({
      relations: {
        workoutExercises: {
          exercise: true,
        },
      },
      order: {
        date: "DESC",
      },
    });

    // Transform to match the expected response format
    const workoutResponses: WorkoutResponse[] = workouts.map((workout) => ({
      id: workout.id,
      date: workout.date,
      withInstructor: workout.withInstructor,
      exercises: workout.workoutExercises.map((we) => ({
        id: we.exercise.id,
        name: we.exercise.name,
        reps: we.reps,
        weight: we.weight,
      })),
    }));

    res.json(workoutResponses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Add new workout
app.post("/workouts", async (req: Request, res: Response) => {
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const { date, withInstructor, exercises } =
      req.body as CreateWorkoutRequest;

    // Create new workout
    const workoutRepository = queryRunner.manager.getRepository(Workout);
    const workout = workoutRepository.create({
      date,
      withInstructor: withInstructor || false,
      workoutExercises: [],
    });

    // Save workout to get ID
    await workoutRepository.save(workout);

    // Process exercises
    const exerciseRepository = queryRunner.manager.getRepository(Exercise);
    const workoutExerciseRepository =
      queryRunner.manager.getRepository(WorkoutExercise);

    for (const exerciseData of exercises) {
      // Get or create exercise
      let exercise = await exerciseRepository.findOne({
        where: { name: exerciseData.name },
      });

      if (!exercise) {
        exercise = exerciseRepository.create({ name: exerciseData.name });
        await exerciseRepository.save(exercise);
      }

      // Create workout-exercise relationship
      const workoutExercise = workoutExerciseRepository.create({
        workout_id: workout.id,
        exercise_id: exercise.id,
        reps: exerciseData.reps,
        weight: exerciseData.weight || null,
        workout,
        exercise,
      });

      await workoutExerciseRepository.save(workoutExercise);
      workout.workoutExercises.push(workoutExercise);
    }

    await queryRunner.commitTransaction();

    // Format response
    const response: WorkoutResponse = {
      id: workout.id,
      date: workout.date,
      withInstructor: workout.withInstructor,
      exercises: workout.workoutExercises.map((we) => ({
        id: we.exercise.id,
        name: we.exercise.name,
        reps: we.reps,
        weight: we.weight,
      })),
    };

    res.json(response);
  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.error(err);
    const error = err as DatabaseError;

    // Check for unique constraint violation
    if (error.code === "23505" && error.constraint === "workouts_date_key") {
      res.status(400).json({ error: "A workout already exists for this date" });
    } else {
      res.status(500).json({ error: error.message || "Server error" });
    }
  } finally {
    await queryRunner.release();
  }
});

// Delete workout
app.delete("/workouts/:id", async (req: Request, res: Response) => {
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const workoutId = parseInt(req.params.id);
    const workoutRepository = queryRunner.manager.getRepository(Workout);

    // Find workout
    const workout = await workoutRepository.findOne({
      where: { id: workoutId },
    });

    if (!workout) {
      return res.status(404).json({ error: "Workout not found" });
    }

    // Delete workout (cascade will handle workout_exercises)
    await workoutRepository.remove(workout);

    await queryRunner.commitTransaction();

    res.json({ id: workoutId });
  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.error(err);
    const error = err as DatabaseError;
    res.status(500).json({ error: error.message || "Server error" });
  } finally {
    await queryRunner.release();
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
