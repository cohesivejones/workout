import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import dataSource from '../../data-source';
import { Workout, Exercise } from '../../entities';
import workoutRoutes from '../../routes/workouts.routes';
import {
  createTestApp,
  createTestUser,
  cleanupTestUser,
  cleanupUserData,
  authenticatedRequest,
  TestUserData,
} from '../helpers';

describe('Workout API Routes', () => {
  let app: express.Application;
  let testUserData: TestUserData;

  beforeAll(async () => {
    app = createTestApp([{ path: '/api/workouts', router: workoutRoutes }]);
    testUserData = await createTestUser();
  });

  afterAll(async () => {
    await cleanupUserData(testUserData.user.id);
    await cleanupTestUser(testUserData.user);
  });

  beforeEach(async () => {
    await cleanupUserData(testUserData.user.id);
  });

  describe('POST /api/workouts', () => {
    it('should require authentication', async () => {
      const workoutData = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [{ name: 'Squats', reps: 10, weight: 100 }],
      };

      const response = await request(app).post('/api/workouts').send(workoutData).expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should create a workout with weight exercises', async () => {
      const workoutData = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [
          { name: 'Bench Press', reps: 10, weight: 135 },
          { name: 'Squat', reps: 8, weight: 185 },
        ],
      };

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.post('/api/workouts').send(workoutData).expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.date).toBe('2024-01-15');
      expect(response.body.withInstructor).toBe(false);
      expect(response.body.exercises).toHaveLength(2);

      expect(response.body.exercises[0].name).toBe('Bench Press');
      expect(response.body.exercises[0].reps).toBe(10);
      expect(response.body.exercises[0].weight).toBe(135);
      expect(response.body.exercises[0].newReps).toBe(false);
      expect(response.body.exercises[0].newWeight).toBe(false);
    });

    it('should create a workout with time-based exercises', async () => {
      const workoutData = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [
          { name: 'Plank', reps: 1, time_seconds: 2 },
          { name: 'Wall Sit', reps: 1, time_seconds: 1.5 },
        ],
      };

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.post('/api/workouts').send(workoutData).expect(200);

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
          { name: 'Pull-ups', reps: 12 },
        ],
      };

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.post('/api/workouts').send(workoutData).expect(200);

      expect(response.body.exercises).toHaveLength(2);
      expect(response.body.exercises[0].weight).toBeNull();
      expect(response.body.exercises[0].time_seconds).toBeNull();
    });

    it('should create a workout with instructor flag', async () => {
      const workoutData = {
        date: '2024-01-15',
        withInstructor: true,
        exercises: [{ name: 'Squats', reps: 10, weight: 100 }],
      };

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.post('/api/workouts').send(workoutData).expect(200);

      expect(response.body.withInstructor).toBe(true);
    });

    it('should set new_reps flag when reps increase', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);

      // Create first workout
      const firstWorkout = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [{ name: 'Bench Press', reps: 10, weight: 135 }],
      };

      await authReq.post('/api/workouts').send(firstWorkout).expect(200);

      // Create second workout with increased reps
      const secondWorkout = {
        date: '2024-01-16',
        withInstructor: false,
        exercises: [{ name: 'Bench Press', reps: 12, weight: 135 }],
      };

      const response = await authReq.post('/api/workouts').send(secondWorkout).expect(200);

      expect(response.body.exercises[0].newReps).toBe(true);
      expect(response.body.exercises[0].newWeight).toBe(false);
    });

    it('should set newWeight flag when weight increases', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);

      // Create first workout
      const firstWorkout = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [{ name: 'Squat', reps: 8, weight: 185 }],
      };

      await authReq.post('/api/workouts').send(firstWorkout).expect(200);

      // Create second workout with increased weight
      const secondWorkout = {
        date: '2024-01-16',
        withInstructor: false,
        exercises: [{ name: 'Squat', reps: 8, weight: 200 }],
      };

      const response = await authReq.post('/api/workouts').send(secondWorkout).expect(200);

      expect(response.body.exercises[0].newReps).toBe(false);
      expect(response.body.exercises[0].newWeight).toBe(true);
    });

    it('should set newTime flag when time increases', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);

      // Create first workout
      const firstWorkout = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [{ name: 'Plank', reps: 1, time_seconds: 2 }],
      };

      await authReq.post('/api/workouts').send(firstWorkout).expect(200);

      // Create second workout with increased time
      const secondWorkout = {
        date: '2024-01-16',
        withInstructor: false,
        exercises: [{ name: 'Plank', reps: 1, time_seconds: 2.5 }],
      };

      const response = await authReq.post('/api/workouts').send(secondWorkout).expect(200);

      expect(response.body.exercises[0].newTime).toBe(true);
    });

    it('should prevent duplicate workouts for same date with user-friendly error', async () => {
      const workoutData = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [{ name: 'Squats', reps: 10, weight: 100 }],
      };

      const authReq = authenticatedRequest(app, testUserData.authToken);

      // Create first workout
      await authReq.post('/api/workouts').send(workoutData).expect(200);

      // Mock console.error to suppress expected error output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Try to create duplicate - should return 400 with user-friendly message
      const response = await authReq.post('/api/workouts').send(workoutData).expect(400);

      expect(response.body.error).toBe('A workout already exists for this date');
      expect(response.status).toBe(400); // Not 500

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });

    it('should create or reuse exercises', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);
      const authReq = authenticatedRequest(app, testUserData.authToken);

      // Create first workout with new exercise
      const firstWorkout = {
        date: '2024-01-15',
        withInstructor: false,
        exercises: [{ name: 'Deadlift', reps: 5, weight: 225 }],
      };

      await authReq.post('/api/workouts').send(firstWorkout).expect(200);

      const exercisesAfterFirst = await exerciseRepository.find({
        where: { userId: testUserData.user.id, name: 'Deadlift' },
      });
      expect(exercisesAfterFirst).toHaveLength(1);

      // Create second workout with same exercise
      const secondWorkout = {
        date: '2024-01-16',
        withInstructor: false,
        exercises: [{ name: 'Deadlift', reps: 5, weight: 235 }],
      };

      await authReq.post('/api/workouts').send(secondWorkout).expect(200);

      // Should still only have one exercise record
      const exercisesAfterSecond = await exerciseRepository.find({
        where: { userId: testUserData.user.id, name: 'Deadlift' },
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
          { name: 'Push-ups', reps: 20 },
        ],
      };

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.post('/api/workouts').send(workoutData).expect(200);

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
        exercises: [{ name: 'Squats', reps: 10, weight: 100 }],
      };

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.post('/api/workouts').send(workoutData).expect(200);

      // Verify in database
      const workoutRepository = dataSource.getRepository(Workout);
      const savedWorkout = await workoutRepository.findOne({
        where: { id: response.body.id },
        relations: {
          workoutExercises: {
            exercise: true,
          },
        },
      });

      expect(savedWorkout).toBeDefined();
      expect(savedWorkout!.date).toBe('2024-01-15');
      expect(savedWorkout!.workoutExercises).toHaveLength(1);
      expect(savedWorkout!.workoutExercises[0].exercise.name).toBe('Squats');
    });
  });
});
