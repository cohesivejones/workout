import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
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
import * as bcrypt from "bcrypt";
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

// Load environment variables from the appropriate .env file
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
const envPath = path.join(__dirname, '..', envFile);
dotenv.config({ path: envPath });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();

// Middleware
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || "").split(','),
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Create API router
const apiRouter = express.Router();

// Authentication routes
apiRouter.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const userRepository = dataSource.getRepository(User);
    const normalizedEmail = email.toLowerCase();
    let user = await userRepository.findOne({ where: { email: normalizedEmail } });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isPasswordValid = user.password
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000,
    });

    res.json({
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

apiRouter.post("/auth/logout", (_req: Request, res: Response) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

apiRouter.get("/auth/me", authenticateToken, (req: Request, res: Response) => {
  const user = req.user!;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
  });
});

apiRouter.post(
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

      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "New password must be at least 6 characters" });
      }

      const isPasswordValid = user.password
        ? await bcrypt.compare(currentPassword, user.password)
        : false;

      if (!isPasswordValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      const userRepository = dataSource.getRepository(User);
      await userRepository.update(user.id, { password: hashedPassword });

      res.json({ message: "Password changed successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Exercise routes
apiRouter.get("/exercises", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const exerciseRepository = dataSource.getRepository(Exercise);
    const exercises = await exerciseRepository.find({
      where: { userId },
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

apiRouter.get("/exercises/recent", authenticateToken, async (req: Request, res: Response) => {
  const { exerciseId } = req.query;
  const userId = req.user!.id;

  if (!exerciseId) {
    return res.status(400).json({
      error: "Exercise ID is required",
    });
  }

  try {
    const workoutExerciseRepository = dataSource.getRepository(WorkoutExercise);

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
      SELECT we.reps, we.weight, we.time_minutes
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

    res.json({
      reps: result[0].reps,
      weight: result[0].weight,
      time_minutes: result[0].time_minutes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

apiRouter.post("/exercises", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.user!.id;
    const exerciseRepository = dataSource.getRepository(Exercise);

    let exercise = await exerciseRepository.findOne({
      where: { name, userId },
    });

    if (!exercise) {
      exercise = exerciseRepository.create({ name, userId });
    }

    await exerciseRepository.save(exercise);
    res.json(exercise);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

apiRouter.put("/exercises/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const exerciseId = parseInt(req.params.id);
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Exercise name is required" });
    }

    const exerciseRepository = dataSource.getRepository(Exercise);
    const exercise = await exerciseRepository.findOne({
      where: { id: exerciseId },
    });

    if (!exercise) {
      return res.status(404).json({ error: "Exercise not found" });
    }

    exercise.name = name;
    await exerciseRepository.save(exercise);
    res.json(exercise);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Workout routes
apiRouter.get("/workouts", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
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

    const workoutResponses: WorkoutResponse[] = workouts.map((workout) => ({
      id: workout.id,
      date: workout.date,
      withInstructor: workout.withInstructor,
      exercises: workout.workoutExercises.map((we) => ({
        id: we.exercise.id,
        name: we.exercise.name,
        reps: we.reps,
        weight: we.weight,
        time_minutes: we.time_minutes,
        new_reps: we.new_reps,
        new_weight: we.new_weight,
        new_time: we.new_time,
      })),
    }));

    res.json(workoutResponses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

apiRouter.get("/workouts/:id", authenticateToken, async (req: Request, res: Response) => {
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

    const workoutResponse: WorkoutResponse = {
      id: workout.id,
      date: workout.date,
      withInstructor: workout.withInstructor,
      exercises: workout.workoutExercises.map((we) => ({
        id: we.exercise.id,
        name: we.exercise.name,
        reps: we.reps,
        weight: we.weight,
        time_minutes: we.time_minutes,
        new_reps: we.new_reps,
        new_weight: we.new_weight,
        new_time: we.new_time,
      })),
    };

    res.json(workoutResponse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Timeline API endpoint - Get paginated timeline data
apiRouter.get("/timeline", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    // Default to last 3 months if no dates provided
    let start: string;
    let end: string;

    if (!startDate || !endDate) {
      const today = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      
      start = threeMonthsAgo.toISOString().split('T')[0];
      end = today.toISOString().split('T')[0];
    } else {
      start = startDate as string;
      end = endDate as string;
    }

    // Fetch all three data types in parallel
    const workoutRepository = dataSource.getRepository(Workout);
    const painScoreRepository = dataSource.getRepository(PainScore);
    const sleepScoreRepository = dataSource.getRepository(SleepScore);

    const [workouts, painScores, sleepScores] = await Promise.all([
      workoutRepository.find({
        where: {
          userId: Number(userId),
          date: Between(start, end),
        },
        relations: {
          workoutExercises: {
            exercise: true,
          },
        },
        order: { date: "DESC" },
      }),
      painScoreRepository.find({
        where: {
          userId: Number(userId),
          date: Between(start, end),
        },
        order: { date: "DESC" },
      }),
      sleepScoreRepository.find({
        where: {
          userId: Number(userId),
          date: Between(start, end),
        },
        order: { date: "DESC" },
      }),
    ]);

    // Check if there's more data before the start date
    const [earlierWorkouts, earlierPainScores, earlierSleepScores] = await Promise.all([
      workoutRepository.count({
        where: {
          userId: Number(userId),
          date: Between('1900-01-01', start),
        },
      }),
      painScoreRepository.count({
        where: {
          userId: Number(userId),
          date: Between('1900-01-01', start),
        },
      }),
      sleepScoreRepository.count({
        where: {
          userId: Number(userId),
          date: Between('1900-01-01', start),
        },
      }),
    ]);

    const hasMore = earlierWorkouts > 0 || earlierPainScores > 0 || earlierSleepScores > 0;

    // Transform workouts to match expected response format
    const workoutResponses: WorkoutResponse[] = workouts.map((workout) => ({
      id: workout.id,
      date: workout.date,
      withInstructor: workout.withInstructor,
      exercises: workout.workoutExercises.map((we) => ({
        id: we.exercise.id,
        name: we.exercise.name,
        reps: we.reps,
        weight: we.weight,
        time_minutes: we.time_minutes,
        new_reps: we.new_reps,
        new_weight: we.new_weight,
        new_time: we.new_time,
      })),
    }));

    res.json({
      workouts: workoutResponses,
      painScores,
      sleepScores,
      hasMore,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Mount API router
app.use("/api", apiRouter);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../../dist")));

// Send all other requests to the React app
app.get("*", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../../dist", "index.html"));
});

export default app;
