import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import dataSource from '../../data-source';
import { User, Workout, Exercise, WorkoutExercise } from '../../entities';
import { generateToken, authenticateToken } from '../../middleware/auth';
import * as bcrypt from 'bcrypt';
import { CreateWorkoutRequest, WorkoutResponse, DatabaseError } from '../../types';

// Create a minimal test app with just the workout endpoints
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  
  const apiRouter = express.Router();
  
  // POST /workouts endpoint implementation
  apiRouter.post("/workouts", authenticateToken, async (req, res) => {
    const queryRunner = dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const { date, withInstructor, exercises } = req.body as CreateWorkoutRequest;
      const userId = req.user!.id;

      // Create new workout
      const workoutRepository = queryRunner.manager.getRepository(Workout);
      const workout = workoutRepository.create({
        userId,
        date,
        withInstructor: withInstructor || false,
        workoutExercises: [],
      });

      await workoutRepository.save(workout);

      // Process exercises
      const exerciseRepository = queryRunner.manager.getRepository(Exercise);
      const workoutExerciseRepository = queryRunner.manager.getRepository(WorkoutExercise);
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
          time_seconds: exerciseData.time_seconds || null,
          workout,
          exercise,
        });

        await workoutExerciseRepository.save(workoutExercise);

        // Find the most recent previous workout exercise for this exercise
        const previousWorkoutExercise = await workoutExerciseRepository.query(`
          SELECT we.reps, we.weight, we.time_seconds
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
          workoutExercise.new_time = workoutExercise.time_seconds !== previousWorkoutExercise[0].time_seconds;
        } else {
          workoutExercise.new_reps = false;
          workoutExercise.new_weight = false;
          workoutExercise.new_time = false;
        }

        const savedWorkoutExercise = await workoutExerciseRepository.save(workoutExercise);
        
        const reloadedWorkoutExercise = await workoutExerciseRepository.findOne({
          where: { 
            workout_id: workout.id,
            exercise_id: exercise.id
          },
          relations: ['exercise']
        });
        
        if (reloadedWorkoutExercise) {
          workout.workoutExercises.push(reloadedWorkoutExercise);
          createdWorkoutExercises.push(reloadedWorkoutExercise);
        }
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
          time_seconds: we.time_seconds,
          new_reps: we.new_reps,
          new_weight: we.new_weight,
          new_time: we.new_time,
        })),
      };

      res.json(response);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error(err);
      const error = err as DatabaseError;

      if (error.code === "23505" && error.constraint === "workouts_date_user_id_key") {
        res.status(400).json({ error: "A workout already exists for this date" });
      } else {
        res.status(500).json({ error: error.message || "Server error" });
      }
    } finally {
      await queryRunner.release();
    }
  });
  
  app.use("/api", apiRouter);
  
  return app;
}

describe('Workout API Routes', () => {
  let app: express.Application;
  let testUser: User;
  let authToken: string;

  beforeAll(async () => {
    app = createTestApp();
    
    const userRepository = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    
    testUser = userRepository.create({
      email: 'workout-test@example.com',
      name: 'Workout Test User',
      password: hashedPassword,
    });
    
    await userRepository.save(testUser);
    authToken = generateToken(testUser);
  });

  afterAll(async () => {
    if (testUser) {
      await dataSource.query(
        'DELETE FROM workout_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE "userId" = $1)',
        [testUser.id]
      );
      await dataSource.query('DELETE FROM workouts WHERE "userId" = $1', [testUser.id]);
      await dataSource.query('DELETE FROM exercises WHERE "userId" = $1', [testUser.id]);
      
      const userRepository = dataSource.getRepository(User);
      await userRepository.remove(testUser);
    }
  });

  beforeEach(async () => {
    await dataSource.query(
      'DELETE FROM workout_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE "userId" = $1)',
      [testUser.id]
    );
    await dataSource.query('DELETE FROM workouts WHERE "userId" = $1', [testUser.id]);
    await dataSource.query('DELETE FROM exercises WHERE "userId" = $1', [testUser.id]);
  });

  describe('POST /api/workouts', () => {
    it('should require authentication', async () => {
      const workoutData = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [
          { name: 'Squats', reps: 10, weight: 100 }
        ]
      };

      const response = await request(app)
        .post('/api/workouts')
        .send(workoutData)
        .expect(401);
      
      expect(response.body.error).toBeDefined();
    });

    it('should create a workout with weight exercises', async () => {
      const workoutData = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [
          { name: 'Bench Press', reps: 10, weight: 135 },
          { name: 'Squat', reps: 8, weight: 185 }
        ]
      };

      const response = await request(app)
        .post('/api/workouts')
        .send(workoutData)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.date).toBe('2024-01-15');
      expect(response.body.withInstructor).toBe(false);
      expect(response.body.exercises).toHaveLength(2);
      
      expect(response.body.exercises[0].name).toBe('Bench Press');
      expect(response.body.exercises[0].reps).toBe(10);
      expect(response.body.exercises[0].weight).toBe(135);
      expect(response.body.exercises[0].new_reps).toBe(false);
      expect(response.body.exercises[0].new_weight).toBe(false);
    });

    it('should create a workout with time-based exercises', async () => {
      const workoutData = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [
          { name: 'Plank', reps: 1, time_seconds: 2 },
          { name: 'Wall Sit', reps: 1, time_seconds: 1.5 }
        ]
      };

      const response = await request(app)
        .post('/api/workouts')
        .send(workoutData)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.exercises).toHaveLength(2);
      expect(response.body.exercises[0].name).toBe('Plank');
      expect(response.body.exercises[0].time_seconds).toBe(2);
      expect(response.body.exercises[1].name).toBe('Wall Sit');
      expect(response.body.exercises[1].time_seconds).toBe(1.5);
    });

    it('should create a workout with bodyweight exercises', async () => {
      const workoutData = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [
          { name: 'Push-ups', reps: 20 },
          { name: 'Pull-ups', reps: 12 }
        ]
      };

      const response = await request(app)
        .post('/api/workouts')
        .send(workoutData)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.exercises).toHaveLength(2);
      expect(response.body.exercises[0].weight).toBeNull();
      expect(response.body.exercises[0].time_seconds).toBeNull();
    });

    it('should create a workout with instructor flag', async () => {
      const workoutData = {
        date: '2024-01-15',
        withInstructor: true,
        exercises: [
          { name: 'Squats', reps: 10, weight: 100 }
        ]
      };

      const response = await request(app)
        .post('/api/workouts')
        .send(workoutData)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.withInstructor).toBe(true);
    });

    it('should set new_reps flag when reps increase', async () => {
      // Create first workout
      const firstWorkout = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [
          { name: 'Bench Press', reps: 10, weight: 135 }
        ]
      };

      await request(app)
        .post('/api/workouts')
        .send(firstWorkout)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      // Create second workout with increased reps
      const secondWorkout = {
        date: '2024-01-16',
        withInstructor: false,
        exercises: [
          { name: 'Bench Press', reps: 12, weight: 135 }
        ]
      };

      const response = await request(app)
        .post('/api/workouts')
        .send(secondWorkout)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.exercises[0].new_reps).toBe(true);
      expect(response.body.exercises[0].new_weight).toBe(false);
    });

    it('should set new_weight flag when weight increases', async () => {
      // Create first workout
      const firstWorkout = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [
          { name: 'Squat', reps: 8, weight: 185 }
        ]
      };

      await request(app)
        .post('/api/workouts')
        .send(firstWorkout)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      // Create second workout with increased weight
      const secondWorkout = {
        date: '2024-01-16',
        withInstructor: false,
        exercises: [
          { name: 'Squat', reps: 8, weight: 200 }
        ]
      };

      const response = await request(app)
        .post('/api/workouts')
        .send(secondWorkout)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.exercises[0].new_reps).toBe(false);
      expect(response.body.exercises[0].new_weight).toBe(true);
    });

    it('should set new_time flag when time increases', async () => {
      // Create first workout
      const firstWorkout = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [
          { name: 'Plank', reps: 1, time_seconds: 2 }
        ]
      };

      await request(app)
        .post('/api/workouts')
        .send(firstWorkout)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      // Create second workout with increased time
      const secondWorkout = {
        date: '2024-01-16',
        withInstructor: false,
        exercises: [
          { name: 'Plank', reps: 1, time_seconds: 2.5 }
        ]
      };

      const response = await request(app)
        .post('/api/workouts')
        .send(secondWorkout)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.exercises[0].new_time).toBe(true);
    });

    it('should prevent duplicate workouts for same date with user-friendly error', async () => {
      const workoutData = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [
          { name: 'Squats', reps: 10, weight: 100 }
        ]
      };

      // Create first workout
      await request(app)
        .post('/api/workouts')
        .send(workoutData)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      // Mock console.error to suppress expected error output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Try to create duplicate - should return 400 with user-friendly message
      const response = await request(app)
        .post('/api/workouts')
        .send(workoutData)
        .set('Cookie', [`token=${authToken}`])
        .expect(400);

      expect(response.body.error).toBe('A workout already exists for this date');
      expect(response.status).toBe(400); // Not 500

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });

    it('should create or reuse exercises', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);

      // Create first workout with new exercise
      const firstWorkout = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [
          { name: 'Deadlift', reps: 5, weight: 225 }
        ]
      };

      await request(app)
        .post('/api/workouts')
        .send(firstWorkout)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      const exercisesAfterFirst = await exerciseRepository.find({
        where: { userId: testUser.id, name: 'Deadlift' }
      });
      expect(exercisesAfterFirst).toHaveLength(1);

      // Create second workout with same exercise
      const secondWorkout = {
        date: '2024-01-16',
        withInstructor: false,
        exercises: [
          { name: 'Deadlift', reps: 5, weight: 235 }
        ]
      };

      await request(app)
        .post('/api/workouts')
        .send(secondWorkout)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      // Should still only have one exercise record
      const exercisesAfterSecond = await exerciseRepository.find({
        where: { userId: testUser.id, name: 'Deadlift' }
      });
      expect(exercisesAfterSecond).toHaveLength(1);
    });

    it('should handle mixed exercise types in one workout', async () => {
      const workoutData = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [
          { name: 'Bench Press', reps: 10, weight: 135 },
          { name: 'Plank', reps: 1, time_seconds: 2 },
          { name: 'Push-ups', reps: 20 }
        ]
      };

      const response = await request(app)
        .post('/api/workouts')
        .send(workoutData)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.exercises).toHaveLength(3);
      expect(response.body.exercises[0].weight).toBe(135);
      expect(response.body.exercises[1].time_seconds).toBe(2);
      expect(response.body.exercises[2].weight).toBeNull();
      expect(response.body.exercises[2].time_seconds).toBeNull();
    });

    it('should persist workout to database', async () => {
      const workoutData = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [
          { name: 'Squats', reps: 10, weight: 100 }
        ]
      };

      const response = await request(app)
        .post('/api/workouts')
        .send(workoutData)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      // Verify in database
      const workoutRepository = dataSource.getRepository(Workout);
      const savedWorkout = await workoutRepository.findOne({
        where: { id: response.body.id },
        relations: {
          workoutExercises: {
            exercise: true
          }
        }
      });

      expect(savedWorkout).toBeDefined();
      expect(savedWorkout!.date).toBe('2024-01-15');
      expect(savedWorkout!.workoutExercises).toHaveLength(1);
      expect(savedWorkout!.workoutExercises[0].exercise.name).toBe('Squats');
    });
  });
});
