import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import {
  DatabaseError,
  WorkoutResponse,
  CreateWorkoutRequest,
  CreatePainScoreRequest,
  CreateSleepScoreRequest,
  LoginRequest,
} from "./types";
import OpenAI from "openai";
import { Between } from "typeorm";
import * as dotenv from "dotenv";
import dataSource from "./data-source";
import {
  Exercise,
  Workout,
  WorkoutExercise,
  User,
  PainScore,
  SleepScore,
} from "./entities";
import { authenticateToken, generateToken } from "./middleware/auth";

// Initialize reflect-metadata
import "reflect-metadata";

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || "http://localhost:3000").split(','),
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Routes

// Authentication routes
// Import bcrypt for password hashing
import * as bcrypt from "bcrypt";

// Login endpoint
app.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const userRepository = dataSource.getRepository(User);

    // Find user by email
    let user = await userRepository.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check if password is correct
    const isPasswordValid = user.password
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user info and token
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Logout endpoint
app.post("/auth/logout", (_req: Request, res: Response) => {
  // Clear the token cookie
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

// Get current user
app.get("/auth/me", authenticateToken, (req: Request, res: Response) => {
  // User is attached to request by authenticateToken middleware
  const user = req.user!;

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
  });
});

// Change password endpoint
app.post(
  "/auth/change-password",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = req.user!;

      if (!currentPassword || !newPassword) {
        return res
          .status(400)
          .json({ error: "Current password and new password are required" });
      }

      // Validate new password
      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "New password must be at least 6 characters" });
      }

      // Verify current password
      const isPasswordValid = user.password
        ? await bcrypt.compare(currentPassword, user.password)
        : false;

      if (!isPasswordValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Hash new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update user's password
      const userRepository = dataSource.getRepository(User);
      await userRepository.update(user.id, { password: hashedPassword });

      res.json({ message: "Password changed successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Get all exercises
app.get("/exercises", async (req: Request, res: Response) => {
  const { userId } = req.query;
  if (!userId)
    return res.status(400).json({
      error: "User ID is required",
    });

  try {
    const exerciseRepository = dataSource.getRepository(Exercise);
    const exercises = await exerciseRepository.find({
      where: { userId: Number(userId) },
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

// Get most recent workout exercise data
app.get("/exercises/recent", async (req: Request, res: Response) => {
  const { userId, exerciseId } = req.query;

  if (!userId || !exerciseId) {
    return res.status(400).json({
      error: "User ID and exercise ID are required",
    });
  }

  try {
    // Find the most recent workout that contains this exercise
    const workoutExerciseRepository = dataSource.getRepository(WorkoutExercise);

    // Use an optimized query that first finds the most recent workout date for this exercise,
    // then directly fetches the workout exercise data for that date
    const result = await workoutExerciseRepository.query(
      `
      WITH latest_workout AS (
        SELECT w.id
        FROM workouts w
        JOIN workout_exercises we ON w.id = we.workout_id
        WHERE we.exercise_id = $1
        AND w."userId" = $2
        ORDER BY w.date DESC
        LIMIT 1
      )
      SELECT we.reps, we.weight
      FROM workout_exercises we
      WHERE we.workout_id = (SELECT id FROM latest_workout)
      AND we.exercise_id = $1
    `,
      [Number(exerciseId), Number(userId)]
    );

    if (!result || result.length === 0) {
      return res.status(404).json({
        error: "No workout found with this exercise",
      });
    }

    // Return the exercise data
    res.json({
      reps: result[0].reps,
      weight: result[0].weight,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Add new exercise
app.post("/exercises", async (req: Request, res: Response) => {
  try {
    const { name, userId } = req.body;
    const exerciseRepository = dataSource.getRepository(Exercise);

    // Check if exercise exists
    let exercise = await exerciseRepository.findOne({
      where: { name, userId },
    });

    if (!exercise) {
      // Create new exercise
      exercise = exerciseRepository.create({ name, userId });
    }

    // Save exercise (either new or existing)
    await exerciseRepository.save(exercise);
    res.json(exercise);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update exercise
app.put("/exercises/:id", async (req: Request, res: Response) => {
  try {
    const exerciseId = parseInt(req.params.id);
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Exercise name is required" });
    }

    const exerciseRepository = dataSource.getRepository(Exercise);

    // Find exercise
    const exercise = await exerciseRepository.findOne({
      where: { id: exerciseId },
    });

    if (!exercise) {
      return res.status(404).json({ error: "Exercise not found" });
    }

    // Update exercise name
    exercise.name = name;

    // Save updated exercise
    await exerciseRepository.save(exercise);
    res.json(exercise);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all workouts with exercises
app.get("/workouts", async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId)
      return res.status(400).json({
        error: "User ID is required",
      });

    const workoutRepository = dataSource.getRepository(Workout);

    const workouts = await workoutRepository.find({
      where: { userId: Number(userId) },
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
        new_reps: we.new_reps,
        new_weight: we.new_weight,
      })),
    }));

    res.json(workoutResponses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get a single workout by ID
app.get("/workouts/:id", async (req: Request, res: Response) => {
  try {
    const workoutId = parseInt(req.params.id);
    const workoutRepository = dataSource.getRepository(Workout);

    const workout = await workoutRepository.findOne({
      where: { id: workoutId },
      relations: {
        workoutExercises: {
          exercise: true,
        },
      },
    });

    if (!workout) {
      return res.status(404).json({ error: "Workout not found" });
    }

    // Transform to match the expected response format
    const workoutResponse: WorkoutResponse = {
      id: workout.id,
      date: workout.date,
      withInstructor: workout.withInstructor,
      exercises: workout.workoutExercises.map((we) => ({
        id: we.exercise.id,
        name: we.exercise.name,
        reps: we.reps,
        weight: we.weight,
        new_reps: we.new_reps,
        new_weight: we.new_weight,
      })),
    };

    res.json(workoutResponse);
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

    const { date, withInstructor, exercises, userId } =
      req.body as CreateWorkoutRequest;

    // Create new workout
    const workoutRepository = queryRunner.manager.getRepository(Workout);
    const workout = workoutRepository.create({
      userId,
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
    const createdWorkoutExercises: WorkoutExercise[] = [];

    for (const exerciseData of exercises) {
      // Get or create exercise
      let exercise = await exerciseRepository.findOne({
        where: { name: exerciseData.name, userId },
      });

      if (!exercise) {
        exercise = exerciseRepository.create({
          name: exerciseData.name,
          userId,
        });
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

      // Save the workout exercise to get an ID
      await workoutExerciseRepository.save(workoutExercise);

      // Find the most recent previous workout exercise for this exercise
      const previousWorkoutExercise = await workoutExerciseRepository.query(`
        SELECT we.reps, we.weight
        FROM workout_exercises we
        JOIN workouts w ON we.workout_id = w.id
        WHERE we.exercise_id = $1
        AND w."userId" = $2
        AND w.date < $3
        ORDER BY w.date DESC
        LIMIT 1
      `, [exercise.id, userId, date]);

      // Set flags based on comparison
      if (previousWorkoutExercise.length > 0) {
        workoutExercise.new_reps = workoutExercise.reps !== previousWorkoutExercise[0].reps;
        workoutExercise.new_weight = workoutExercise.weight !== previousWorkoutExercise[0].weight;
      } else {
        // First time this exercise appears in a workout
        workoutExercise.new_reps = false;
        workoutExercise.new_weight = false;
      }

      // Save the updated flags
      await workoutExerciseRepository.save(workoutExercise);
      
      workout.workoutExercises.push(workoutExercise);
      createdWorkoutExercises.push(workoutExercise);
    }

    await queryRunner.commitTransaction();

    // Format response
    const response: WorkoutResponse = {
      id: workout.id,
      date: workout.date,
      withInstructor: workout.withInstructor,
      exercises: createdWorkoutExercises.map((we) => ({
        id: we.exercise.id,
        name: we.exercise.name,
        reps: we.reps,
        weight: we.weight,
        new_reps: we.new_reps,
        new_weight: we.new_weight,
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

// Update workout
app.put("/workouts/:id", async (req: Request, res: Response) => {
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const workoutId = parseInt(req.params.id);
    const { date, withInstructor, exercises } =
      req.body as CreateWorkoutRequest;

    // Find workout
    const workoutRepository = queryRunner.manager.getRepository(Workout);
    const workout = await workoutRepository.findOne({
      where: { id: workoutId },
      loadRelationIds: true,
      relations: {
        workoutExercises: {
          exercise: true,
        },
      },
    });

    if (!workout) {
      return res.status(404).json({ error: "Workout not found" });
    }

    // Update workout properties
    workout.date = date;
    workout.withInstructor = withInstructor || false;
    await workoutRepository.save(workout);

    // Delete existing workout exercises
    const workoutExerciseRepository =
      queryRunner.manager.getRepository(WorkoutExercise);

    // First, delete all existing workout exercises for this workout
    await workoutExerciseRepository.delete({ workout_id: workout.id });

    // Process new exercises
    const exerciseRepository = queryRunner.manager.getRepository(Exercise);
    const newWorkoutExercises = [];

    for (const exerciseData of exercises) {
      // Get or create exercise
      let exercise = await exerciseRepository.findOne({
        where: { name: exerciseData.name, userId: workout.userId },
      });

      if (!exercise) {
        exercise = exerciseRepository.create({
          name: exerciseData.name,
          userId: workout.userId,
        });
        await exerciseRepository.save(exercise);
      }

      // Create workout-exercise relationship
      const workoutExercise = workoutExerciseRepository.create({
        workout_id: workout.id,
        exercise_id: exercise.id,
        reps: exerciseData.reps,
        weight: exerciseData.weight || null,
        workout: workout,
        exercise: exercise,
      });

      // Save the workout exercise to get an ID
      await workoutExerciseRepository.save(workoutExercise);

      // Find the most recent previous workout exercise for this exercise
      const previousWorkoutExercise = await workoutExerciseRepository.query(`
        SELECT we.reps, we.weight
        FROM workout_exercises we
        JOIN workouts w ON we.workout_id = w.id
        WHERE we.exercise_id = $1
        AND w."userId" = $2
        AND w.date < $3
        ORDER BY w.date DESC
        LIMIT 1
      `, [exercise.id, workout.userId, date]);

      // Set flags based on comparison
      if (previousWorkoutExercise.length > 0) {
        workoutExercise.new_reps = workoutExercise.reps !== previousWorkoutExercise[0].reps;
        workoutExercise.new_weight = workoutExercise.weight !== previousWorkoutExercise[0].weight;
      } else {
        // First time this exercise appears in a workout
        workoutExercise.new_reps = false;
        workoutExercise.new_weight = false;
      }

      // Save the updated flags
      await workoutExerciseRepository.save(workoutExercise);
      
      newWorkoutExercises.push(workoutExercise);
    }

    await queryRunner.commitTransaction();

    // Format response
    const response: WorkoutResponse = {
      id: workout.id,
      date: workout.date,
      withInstructor: workout.withInstructor,
      exercises: newWorkoutExercises.map((we: WorkoutExercise) => ({
        id: we.exercise.id,
        name: we.exercise.name,
        reps: we.reps,
        weight: we.weight,
        new_reps: we.new_reps,
        new_weight: we.new_weight,
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

// Pain Score Routes

// Get all pain scores for a user
app.get("/pain-scores", async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId)
      return res.status(400).json({
        error: "User ID is required",
      });

    const painScoreRepository = dataSource.getRepository(PainScore);
    const painScores = await painScoreRepository.find({
      where: { userId: Number(userId) },
      order: {
        date: "DESC",
      },
    });

    res.json(painScores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get a single pain score by ID
app.get("/pain-scores/:id", async (req: Request, res: Response) => {
  try {
    const painScoreId = parseInt(req.params.id);
    const painScoreRepository = dataSource.getRepository(PainScore);

    const painScore = await painScoreRepository.findOne({
      where: { id: painScoreId },
    });

    if (!painScore) {
      return res.status(404).json({ error: "Pain score not found" });
    }

    res.json(painScore);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Add new pain score
app.post("/pain-scores", async (req: Request, res: Response) => {
  try {
    const { userId, date, score, notes } = req.body as CreatePainScoreRequest;

    // Validate score is between 0 and 10
    if (score < 0 || score > 10) {
      return res
        .status(400)
        .json({ error: "Pain score must be between 0 and 10" });
    }

    // Create new pain score
    const painScoreRepository = dataSource.getRepository(PainScore);
    const painScore = painScoreRepository.create({
      userId,
      date,
      score,
      notes: notes || null,
    });

    // Save pain score
    await painScoreRepository.save(painScore);
    res.json(painScore);
  } catch (err) {
    console.error(err);
    const error = err as DatabaseError;

    // Check for unique constraint violation
    if (
      error.code === "23505" &&
      error.constraint === "UQ_pain_scores_userId_date"
    ) {
      res
        .status(400)
        .json({ error: "A pain score already exists for this date" });
    } else {
      res.status(500).json({ error: error.message || "Server error" });
    }
  }
});

// Update pain score
app.put("/pain-scores/:id", async (req: Request, res: Response) => {
  try {
    const painScoreId = parseInt(req.params.id);
    const { date, score, notes } = req.body as Omit<
      CreatePainScoreRequest,
      "userId"
    >;

    // Validate score is between 0 and 10
    if (score < 0 || score > 10) {
      return res
        .status(400)
        .json({ error: "Pain score must be between 0 and 10" });
    }

    // Find pain score
    const painScoreRepository = dataSource.getRepository(PainScore);
    const painScore = await painScoreRepository.findOne({
      where: { id: painScoreId },
    });

    if (!painScore) {
      return res.status(404).json({ error: "Pain score not found" });
    }

    // Update pain score properties
    painScore.date = date;
    painScore.score = score;
    painScore.notes = notes || null;

    // Save updated pain score
    await painScoreRepository.save(painScore);
    res.json(painScore);
  } catch (err) {
    console.error(err);
    const error = err as DatabaseError;

    // Check for unique constraint violation
    if (
      error.code === "23505" &&
      error.constraint === "UQ_pain_scores_userId_date"
    ) {
      res
        .status(400)
        .json({ error: "A pain score already exists for this date" });
    } else {
      res.status(500).json({ error: error.message || "Server error" });
    }
  }
});

// Delete pain score
app.delete("/pain-scores/:id", async (req: Request, res: Response) => {
  try {
    const painScoreId = parseInt(req.params.id);
    const painScoreRepository = dataSource.getRepository(PainScore);

    // Find pain score
    const painScore = await painScoreRepository.findOne({
      where: { id: painScoreId },
    });

    if (!painScore) {
      return res.status(404).json({ error: "Pain score not found" });
    }

    // Delete pain score
    await painScoreRepository.remove(painScore);
    res.json({ id: painScoreId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Sleep Score Routes

// Get all sleep scores for a user
app.get("/sleep-scores", async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId)
      return res.status(400).json({
        error: "User ID is required",
      });

    const sleepScoreRepository = dataSource.getRepository(SleepScore);
    const sleepScores = await sleepScoreRepository.find({
      where: { userId: Number(userId) },
      order: {
        date: "DESC",
      },
    });

    res.json(sleepScores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get a single sleep score by ID
app.get("/sleep-scores/:id", async (req: Request, res: Response) => {
  try {
    const sleepScoreId = parseInt(req.params.id);
    const sleepScoreRepository = dataSource.getRepository(SleepScore);

    const sleepScore = await sleepScoreRepository.findOne({
      where: { id: sleepScoreId },
    });

    if (!sleepScore) {
      return res.status(404).json({ error: "Sleep score not found" });
    }

    res.json(sleepScore);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Add new sleep score
app.post("/sleep-scores", async (req: Request, res: Response) => {
  try {
    const { userId, date, score, notes } = req.body as CreateSleepScoreRequest;

    // Validate score is between 1 and 5
    if (score < 1 || score > 5) {
      return res
        .status(400)
        .json({ error: "Sleep score must be between 1 and 5" });
    }

    // Create new sleep score
    const sleepScoreRepository = dataSource.getRepository(SleepScore);
    const sleepScore = sleepScoreRepository.create({
      userId,
      date,
      score,
      notes: notes || null,
    });

    // Save sleep score
    await sleepScoreRepository.save(sleepScore);
    res.json(sleepScore);
  } catch (err) {
    console.error(err);
    const error = err as DatabaseError;

    // Check for unique constraint violation
    if (
      error.code === "23505" &&
      error.constraint === "UQ_sleep_scores_userId_date"
    ) {
      res
        .status(400)
        .json({ error: "A sleep score already exists for this date" });
    } else {
      res.status(500).json({ error: error.message || "Server error" });
    }
  }
});

// Update sleep score
app.put("/sleep-scores/:id", async (req: Request, res: Response) => {
  try {
    const sleepScoreId = parseInt(req.params.id);
    const { date, score, notes } = req.body as Omit<
      CreateSleepScoreRequest,
      "userId"
    >;

    // Validate score is between 1 and 5
    if (score < 1 || score > 5) {
      return res
        .status(400)
        .json({ error: "Sleep score must be between 1 and 5" });
    }

    // Find sleep score
    const sleepScoreRepository = dataSource.getRepository(SleepScore);
    const sleepScore = await sleepScoreRepository.findOne({
      where: { id: sleepScoreId },
    });

    if (!sleepScore) {
      return res.status(404).json({ error: "Sleep score not found" });
    }

    // Update sleep score properties
    sleepScore.date = date;
    sleepScore.score = score;
    sleepScore.notes = notes || null;

    // Save updated sleep score
    await sleepScoreRepository.save(sleepScore);
    res.json(sleepScore);
  } catch (err) {
    console.error(err);
    const error = err as DatabaseError;

    // Check for unique constraint violation
    if (
      error.code === "23505" &&
      error.constraint === "UQ_sleep_scores_userId_date"
    ) {
      res
        .status(400)
        .json({ error: "A sleep score already exists for this date" });
    } else {
      res.status(500).json({ error: error.message || "Server error" });
    }
  }
});

// Delete sleep score
app.delete("/sleep-scores/:id", async (req: Request, res: Response) => {
  try {
    const sleepScoreId = parseInt(req.params.id);
    const sleepScoreRepository = dataSource.getRepository(SleepScore);

    // Find sleep score
    const sleepScore = await sleepScoreRepository.findOne({
      where: { id: sleepScoreId },
    });

    if (!sleepScore) {
      return res.status(404).json({ error: "Sleep score not found" });
    }

    // Delete sleep score
    await sleepScoreRepository.remove(sleepScore);
    res.json({ id: sleepScoreId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Diagnostician Routes

// Get diagnostic data (last two months of workouts and pain scores)
app.get("/diagnostics/data", async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Calculate date range (last two months)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 2);

    // Format dates for SQL query
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Fetch workouts, pain scores, and sleep scores within date range
    const workoutRepository = dataSource.getRepository(Workout);
    const painScoreRepository = dataSource.getRepository(PainScore);
    const sleepScoreRepository = dataSource.getRepository(SleepScore);

    const [workouts, painScores, sleepScores] = await Promise.all([
      workoutRepository.find({
        where: {
          userId: Number(userId),
          date: Between(startDateStr, endDateStr),
        },
        relations: {
          workoutExercises: {
            exercise: true,
          },
        },
        order: { date: "ASC" },
      }),
      painScoreRepository.find({
        where: {
          userId: Number(userId),
          date: Between(startDateStr, endDateStr),
        },
        order: { date: "ASC" },
      }),
      sleepScoreRepository.find({
        where: {
          userId: Number(userId),
          date: Between(startDateStr, endDateStr),
        },
        order: { date: "ASC" },
      }),
    ]);

    // Transform data for response
    const diagnosticData = {
      workouts: workouts.map((workout) => ({
        id: workout.id,
        date: workout.date,
        exercises: workout.workoutExercises.map((we) => ({
          name: we.exercise.name,
          reps: we.reps,
          weight: we.weight,
        })),
      })),
      painScores: painScores,
      sleepScores: sleepScores,
      dateRange: {
        start: startDateStr,
        end: endDateStr,
      },
    };

    res.json(diagnosticData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Analyze diagnostic data using OpenAI
app.post("/diagnostics/analyze", async (req: Request, res: Response) => {
  try {
    const { diagnosticData } = req.body;

    if (!diagnosticData) {
      return res.status(400).json({ error: "Diagnostic data is required" });
    }

    // Create system and user prompts
    const systemPrompt = `You are a fitness and health analysis assistant. Your task is to analyze workout and pain data to identify potential correlations between specific exercises and reported pain. Focus on patterns where pain scores increase after certain exercises are performed. Consider frequency, intensity, and timing of exercises relative to pain reports.`;

    const userPrompt = `I'm providing two months of workout, pain, and sleep data. Please analyze this data to identify which exercises might be causing recurring pain and how sleep quality might be affecting pain levels.
    
    Workout Data:
    ${JSON.stringify(diagnosticData.workouts, null, 2)}
    
    Pain Score Data:
    ${JSON.stringify(diagnosticData.painScores, null, 2)}
    
    Sleep Score Data:
    ${JSON.stringify(diagnosticData.sleepScores, null, 2)}
    
    Date Range: ${diagnosticData.dateRange.start} to ${
      diagnosticData.dateRange.end
    }
    
    Please provide a detailed analysis of potential correlations between specific exercises, sleep quality, and pain, with recommendations for exercises that might need modification or should be avoided.`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    });

    // Return the analysis
    res.json({ analysis: response.choices[0].message.content });
  } catch (err) {
    console.error("OpenAI API error:", err);
    res.status(500).json({ error: "Failed to analyze diagnostic data" });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
