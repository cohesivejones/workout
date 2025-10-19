import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import dataSource from '../../data-source';
import { User, Workout, PainScore, SleepScore, Exercise, WorkoutExercise } from '../../entities';
import { generateToken, authenticateToken } from '../../middleware/auth';
import * as bcrypt from 'bcrypt';

// Create a minimal test app with just the timeline endpoint
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  
  const apiRouter = express.Router();
  
  // Timeline endpoint implementation
  apiRouter.get("/timeline", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;

      // Fetch all three data types in parallel
      const workoutRepository = dataSource.getRepository(Workout);
      const painScoreRepository = dataSource.getRepository(PainScore);
      const sleepScoreRepository = dataSource.getRepository(SleepScore);

      // If date range is provided, filter by it; otherwise return all data
      const workoutWhere: any = { userId: Number(userId) };
      const painScoreWhere: any = { userId: Number(userId) };
      const sleepScoreWhere: any = { userId: Number(userId) };

      if (startDate && endDate) {
        const { Between } = await import('typeorm');
        const start = startDate as string;
        const end = endDate as string;
        workoutWhere.date = Between(start, end);
        painScoreWhere.date = Between(start, end);
        sleepScoreWhere.date = Between(start, end);
      }

      const [workouts, painScores, sleepScores] = await Promise.all([
        workoutRepository.find({
          where: workoutWhere,
          relations: {
            workoutExercises: {
              exercise: true,
            },
          },
          order: { date: "DESC" },
        }),
        painScoreRepository.find({
          where: painScoreWhere,
          order: { date: "DESC" },
        }),
        sleepScoreRepository.find({
          where: sleepScoreWhere,
          order: { date: "DESC" },
        }),
      ]);

      // Check if there's more data before the start date (only if date range was provided)
      let hasMore = false;
      if (startDate && endDate) {
        const { Between } = await import('typeorm');
        const start = startDate as string;
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
        hasMore = earlierWorkouts > 0 || earlierPainScores > 0 || earlierSleepScores > 0;
      }

      // Transform workouts to match expected response format
      const workoutResponses = workouts.map((workout) => ({
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
  
  app.use("/api", apiRouter);
  
  return app;
}

describe('Timeline API Routes', () => {
  let app: express.Application;
  let testUser: User;
  let authToken: string;

  beforeAll(async () => {
    // Create test app
    app = createTestApp();
    
    // Create test user
    const userRepository = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    
    testUser = userRepository.create({
      email: 'timeline-test@example.com',
      name: 'Timeline Test User',
      password: hashedPassword,
    });
    
    await userRepository.save(testUser);
    authToken = generateToken(testUser);
  });

  afterAll(async () => {
    // Clean up test user and all related data
    if (testUser) {
      await dataSource.query(
        'DELETE FROM workout_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE "userId" = $1)',
        [testUser.id]
      );
      await dataSource.query('DELETE FROM workouts WHERE "userId" = $1', [testUser.id]);
      await dataSource.query('DELETE FROM pain_scores WHERE "userId" = $1', [testUser.id]);
      await dataSource.query('DELETE FROM sleep_scores WHERE "userId" = $1', [testUser.id]);
      await dataSource.query('DELETE FROM exercises WHERE "userId" = $1', [testUser.id]);
      
      const userRepository = dataSource.getRepository(User);
      await userRepository.remove(testUser);
    }
  });

  beforeEach(async () => {
    // Clear test data before each test
    await dataSource.query(
      'DELETE FROM workout_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE "userId" = $1)',
      [testUser.id]
    );
    await dataSource.query('DELETE FROM workouts WHERE "userId" = $1', [testUser.id]);
    await dataSource.query('DELETE FROM pain_scores WHERE "userId" = $1', [testUser.id]);
    await dataSource.query('DELETE FROM sleep_scores WHERE "userId" = $1', [testUser.id]);
    await dataSource.query('DELETE FROM exercises WHERE "userId" = $1', [testUser.id]);
  });

  describe('GET /api/timeline', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/timeline')
        .expect(401);
      
      expect(response.body.error).toBeDefined();
    });

    it('should return all three data types in date range', async () => {
      // Create test data
      const workoutRepository = dataSource.getRepository(Workout);
      const painScoreRepository = dataSource.getRepository(PainScore);
      const sleepScoreRepository = dataSource.getRepository(SleepScore);
      const exerciseRepository = dataSource.getRepository(Exercise);
      const workoutExerciseRepository = dataSource.getRepository(WorkoutExercise);

      // Create a workout
      const workout = workoutRepository.create({
        userId: testUser.id,
        date: '2024-01-15',
        withInstructor: false,
      });
      await workoutRepository.save(workout);

      // Add exercise to workout
      const exercise = exerciseRepository.create({
        name: 'Squats',
        userId: testUser.id,
      });
      await exerciseRepository.save(exercise);

      const workoutExercise = workoutExerciseRepository.create({
        workout_id: workout.id,
        exercise_id: exercise.id,
        reps: 10,
        weight: 100,
        time_minutes: null,
        new_reps: false,
        new_weight: false,
        new_time: false,
      });
      await workoutExerciseRepository.save(workoutExercise);

      // Create a pain score
      const painScore = painScoreRepository.create({
        userId: testUser.id,
        date: '2024-01-16',
        score: 3,
        notes: 'Mild discomfort',
      });
      await painScoreRepository.save(painScore);

      // Create a sleep score
      const sleepScore = sleepScoreRepository.create({
        userId: testUser.id,
        date: '2024-01-17',
        score: 4,
        notes: 'Good sleep',
      });
      await sleepScoreRepository.save(sleepScore);

      // Make request
      const response = await request(app)
        .get('/api/timeline')
        .query({ startDate: '2024-01-01', endDate: '2024-01-31' })
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('workouts');
      expect(response.body).toHaveProperty('painScores');
      expect(response.body).toHaveProperty('sleepScores');
      expect(response.body).toHaveProperty('hasMore');
      
      expect(response.body.workouts).toHaveLength(1);
      expect(response.body.painScores).toHaveLength(1);
      expect(response.body.sleepScores).toHaveLength(1);
      expect(response.body.hasMore).toBe(false);
    });

    it('should filter data correctly by date range', async () => {
      const workoutRepository = dataSource.getRepository(Workout);

      // Create workouts in different months
      await workoutRepository.save(
        workoutRepository.create({
          userId: testUser.id,
          date: '2024-01-15',
          withInstructor: false,
        })
      );
      
      await workoutRepository.save(
        workoutRepository.create({
          userId: testUser.id,
          date: '2024-02-15',
          withInstructor: false,
        })
      );
      
      await workoutRepository.save(
        workoutRepository.create({
          userId: testUser.id,
          date: '2024-03-15',
          withInstructor: false,
        })
      );

      // Request only February data
      const response = await request(app)
        .get('/api/timeline')
        .query({ startDate: '2024-02-01', endDate: '2024-02-29' })
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.workouts).toHaveLength(1);
      expect(response.body.workouts[0].date).toBe('2024-02-15');
    });

    it('should return hasMore: true when data exists before startDate', async () => {
      const workoutRepository = dataSource.getRepository(Workout);

      // Create workouts in January and February
      await workoutRepository.save(
        workoutRepository.create({
          userId: testUser.id,
          date: '2024-01-15',
          withInstructor: false,
        })
      );
      
      await workoutRepository.save(
        workoutRepository.create({
          userId: testUser.id,
          date: '2024-02-15',
          withInstructor: false,
        })
      );

      // Request only February data
      const response = await request(app)
        .get('/api/timeline')
        .query({ startDate: '2024-02-01', endDate: '2024-02-29' })
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.hasMore).toBe(true);
    });

    it('should return hasMore: false when no data exists before startDate', async () => {
      const workoutRepository = dataSource.getRepository(Workout);

      // Create workout only in February
      await workoutRepository.save(
        workoutRepository.create({
          userId: testUser.id,
          date: '2024-02-15',
          withInstructor: false,
        })
      );

      // Request February data
      const response = await request(app)
        .get('/api/timeline')
        .query({ startDate: '2024-02-01', endDate: '2024-02-29' })
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.hasMore).toBe(false);
    });

    it('should return all data when no dates provided', async () => {
      const workoutRepository = dataSource.getRepository(Workout);
      
      const today = new Date();
      const fourMonthsAgo = new Date(today);
      fourMonthsAgo.setMonth(today.getMonth() - 4);
      
      const twoMonthsAgo = new Date(today);
      twoMonthsAgo.setMonth(today.getMonth() - 2);

      // Create workout 4 months ago (should be included)
      await workoutRepository.save(
        workoutRepository.create({
          userId: testUser.id,
          date: fourMonthsAgo.toISOString().split('T')[0],
          withInstructor: false,
        })
      );
      
      // Create workout 2 months ago (should be included)
      await workoutRepository.save(
        workoutRepository.create({
          userId: testUser.id,
          date: twoMonthsAgo.toISOString().split('T')[0],
          withInstructor: false,
        })
      );

      const response = await request(app)
        .get('/api/timeline')
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      // Should return all workouts when no date range is specified
      expect(response.body.workouts).toHaveLength(2);
      expect(response.body.hasMore).toBe(false);
    });

    it('should return empty arrays when no data in range', async () => {
      const response = await request(app)
        .get('/api/timeline')
        .query({ startDate: '2024-01-01', endDate: '2024-01-31' })
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.workouts).toEqual([]);
      expect(response.body.painScores).toEqual([]);
      expect(response.body.sleepScores).toEqual([]);
      expect(response.body.hasMore).toBe(false);
    });

    it('should only return data for authenticated user', async () => {
      const workoutRepository = dataSource.getRepository(Workout);
      const userRepository = dataSource.getRepository(User);

      // Create another user with unique email
      const hashedPassword = await bcrypt.hash('testpass123', 10);
      const uniqueEmail = `other-user-${Date.now()}@example.com`;
      const otherUser = userRepository.create({
        email: uniqueEmail,
        name: 'Other User',
        password: hashedPassword,
      });
      await userRepository.save(otherUser);

      // Create workout for other user
      await workoutRepository.save(
        workoutRepository.create({
          userId: otherUser.id,
          date: '2024-01-15',
          withInstructor: false,
        })
      );

      // Create workout for test user
      await workoutRepository.save(
        workoutRepository.create({
          userId: testUser.id,
          date: '2024-01-16',
          withInstructor: false,
        })
      );

      // Request with test user's token
      const response = await request(app)
        .get('/api/timeline')
        .query({ startDate: '2024-01-01', endDate: '2024-01-31' })
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      // Should only see test user's workout
      expect(response.body.workouts).toHaveLength(1);
      expect(response.body.workouts[0].date).toBe('2024-01-16');

      // Clean up other user
      await dataSource.query('DELETE FROM workouts WHERE "userId" = $1', [otherUser.id]);
      await userRepository.remove(otherUser);
    });
  });
});
