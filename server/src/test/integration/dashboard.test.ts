import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import dataSource from '../../data-source';
import { Workout, Exercise, WorkoutExercise, PainScore, SleepScore } from '../../entities';
import dashboardRouter from '../../routes/dashboard.routes';
import {
  createTestApp,
  createTestUser,
  cleanupTestUser,
  cleanupUserData,
  authenticatedRequest,
  TestUserData,
} from '../helpers';

describe('Dashboard API Routes', () => {
  let app: express.Application;
  let testUserData: TestUserData;

  beforeAll(async () => {
    app = createTestApp([{ path: '/api/dashboard', router: dashboardRouter }]);
    testUserData = await createTestUser();
  });

  afterAll(async () => {
    await cleanupUserData(testUserData.user.id);
    await cleanupTestUser(testUserData.user);
  });

  beforeEach(async () => {
    await cleanupUserData(testUserData.user.id);
  });

  describe('GET /api/dashboard/weight-progression', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/dashboard/weight-progression').expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return empty array when no workouts exist', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/dashboard/weight-progression').expect(200);
      expect(response.body).toEqual([]);
    });

    it('should return weight progression data for last 12 weeks', async () => {
      const workoutRepository = dataSource.getRepository(Workout);
      const exerciseRepository = dataSource.getRepository(Exercise);
      const workoutExerciseRepository = dataSource.getRepository(WorkoutExercise);

      // Create exercise
      const exercise = exerciseRepository.create({
        name: 'Bench Press',
        userId: testUserData.user.id,
      });
      await exerciseRepository.save(exercise);

      // Create workouts with progression over time
      const today = new Date();
      const dates = [
        new Date(today.getTime() - 70 * 24 * 60 * 60 * 1000), // 70 days ago
        new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
        new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      ];

      const weights = [135, 145, 155];

      for (let i = 0; i < dates.length; i++) {
        const workout = workoutRepository.create({
          userId: testUserData.user.id,
          date: dates[i].toISOString().split('T')[0],
          withInstructor: false,
        });
        await workoutRepository.save(workout);

        const workoutExercise = workoutExerciseRepository.create({
          workout_id: workout.id,
          exercise_id: exercise.id,
          reps: 10,
          weight: weights[i],
          time_seconds: null,
        });
        await workoutExerciseRepository.save(workoutExercise);
      }

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/dashboard/weight-progression').expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].exerciseName).toBe('Bench Press');
      expect(response.body[0].dataPoints).toHaveLength(3);
      expect(response.body[0].dataPoints[0].weight).toBe(135);
      expect(response.body[0].dataPoints[1].weight).toBe(145);
      expect(response.body[0].dataPoints[2].weight).toBe(155);
    });

    it('should exclude exercises without weight data', async () => {
      const workoutRepository = dataSource.getRepository(Workout);
      const exerciseRepository = dataSource.getRepository(Exercise);
      const workoutExerciseRepository = dataSource.getRepository(WorkoutExercise);

      // Create exercises
      const weightedExercise = exerciseRepository.create({
        name: 'Squats',
        userId: testUserData.user.id,
      });
      const bodyweightExercise = exerciseRepository.create({
        name: 'Push-ups',
        userId: testUserData.user.id,
      });
      await exerciseRepository.save([weightedExercise, bodyweightExercise]);

      const today = new Date();
      const workout = workoutRepository.create({
        userId: testUserData.user.id,
        date: today.toISOString().split('T')[0],
        withInstructor: false,
      });
      await workoutRepository.save(workout);

      // Weighted exercise
      const we1 = workoutExerciseRepository.create({
        workout_id: workout.id,
        exercise_id: weightedExercise.id,
        reps: 10,
        weight: 185,
        time_seconds: null,
      });
      await workoutExerciseRepository.save(we1);

      // Bodyweight exercise (no weight)
      const we2 = workoutExerciseRepository.create({
        workout_id: workout.id,
        exercise_id: bodyweightExercise.id,
        reps: 20,
        weight: null,
        time_seconds: null,
      });
      await workoutExerciseRepository.save(we2);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/dashboard/weight-progression').expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].exerciseName).toBe('Squats');
    });

    it('should only return data from last 84 days', async () => {
      const workoutRepository = dataSource.getRepository(Workout);
      const exerciseRepository = dataSource.getRepository(Exercise);
      const workoutExerciseRepository = dataSource.getRepository(WorkoutExercise);

      const exercise = exerciseRepository.create({
        name: 'Deadlift',
        userId: testUserData.user.id,
      });
      await exerciseRepository.save(exercise);

      const today = new Date();

      // Workout within 84 days
      const recentDate = new Date(today.getTime() - 50 * 24 * 60 * 60 * 1000);
      const recentWorkout = workoutRepository.create({
        userId: testUserData.user.id,
        date: recentDate.toISOString().split('T')[0],
        withInstructor: false,
      });
      await workoutRepository.save(recentWorkout);

      const recentWE = workoutExerciseRepository.create({
        workout_id: recentWorkout.id,
        exercise_id: exercise.id,
        reps: 5,
        weight: 225,
        time_seconds: null,
      });
      await workoutExerciseRepository.save(recentWE);

      // Workout older than 84 days
      const oldDate = new Date(today.getTime() - 100 * 24 * 60 * 60 * 1000);
      const oldWorkout = workoutRepository.create({
        userId: testUserData.user.id,
        date: oldDate.toISOString().split('T')[0],
        withInstructor: false,
      });
      await workoutRepository.save(oldWorkout);

      const oldWE = workoutExerciseRepository.create({
        workout_id: oldWorkout.id,
        exercise_id: exercise.id,
        reps: 5,
        weight: 185,
        time_seconds: null,
      });
      await workoutExerciseRepository.save(oldWE);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/dashboard/weight-progression').expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].dataPoints).toHaveLength(1);
      expect(response.body[0].dataPoints[0].weight).toBe(225);
    });

    it('should group multiple exercises separately', async () => {
      const workoutRepository = dataSource.getRepository(Workout);
      const exerciseRepository = dataSource.getRepository(Exercise);
      const workoutExerciseRepository = dataSource.getRepository(WorkoutExercise);

      const bench = exerciseRepository.create({
        name: 'Bench Press',
        userId: testUserData.user.id,
      });
      const squat = exerciseRepository.create({ name: 'Squat', userId: testUserData.user.id });
      await exerciseRepository.save([bench, squat]);

      const today = new Date();
      const workout = workoutRepository.create({
        userId: testUserData.user.id,
        date: today.toISOString().split('T')[0],
        withInstructor: false,
      });
      await workoutRepository.save(workout);

      const we1 = workoutExerciseRepository.create({
        workout_id: workout.id,
        exercise_id: bench.id,
        reps: 10,
        weight: 135,
        time_seconds: null,
      });
      const we2 = workoutExerciseRepository.create({
        workout_id: workout.id,
        exercise_id: squat.id,
        reps: 8,
        weight: 185,
        time_seconds: null,
      });
      await workoutExerciseRepository.save([we1, we2]);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/dashboard/weight-progression').expect(200);

      expect(response.body).toHaveLength(2);
      const exerciseNames = response.body.map((e: { exerciseName: string }) => e.exerciseName);
      expect(exerciseNames).toContain('Bench Press');
      expect(exerciseNames).toContain('Squat');
    });
  });

  describe('GET /api/dashboard/pain-progression', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/dashboard/pain-progression').expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return empty array when no pain scores exist', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/dashboard/pain-progression').expect(200);
      expect(response.body.dataPoints).toEqual([]);
    });

    it('should return pain progression data for last 12 weeks', async () => {
      const painScoreRepository = dataSource.getRepository(PainScore);

      const today = new Date();
      const dates = [
        new Date(today.getTime() - 70 * 24 * 60 * 60 * 1000),
        new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000),
        new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
      ];

      const scores = [7, 5, 3];

      for (let i = 0; i < dates.length; i++) {
        const painScore = painScoreRepository.create({
          userId: testUserData.user.id,
          date: dates[i].toISOString().split('T')[0],
          score: scores[i],
          notes: null,
        });
        await painScoreRepository.save(painScore);
      }

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/dashboard/pain-progression').expect(200);

      expect(response.body.dataPoints).toHaveLength(3);
      expect(response.body.dataPoints[0].score).toBe(7);
      expect(response.body.dataPoints[1].score).toBe(5);
      expect(response.body.dataPoints[2].score).toBe(3);
    });

    it('should only return data from last 84 days', async () => {
      const painScoreRepository = dataSource.getRepository(PainScore);

      const today = new Date();

      // Pain score within 84 days
      const recentDate = new Date(today.getTime() - 50 * 24 * 60 * 60 * 1000);
      const recentPainScore = painScoreRepository.create({
        userId: testUserData.user.id,
        date: recentDate.toISOString().split('T')[0],
        score: 5,
        notes: null,
      });
      await painScoreRepository.save(recentPainScore);

      // Pain score older than 84 days
      const oldDate = new Date(today.getTime() - 100 * 24 * 60 * 60 * 1000);
      const oldPainScore = painScoreRepository.create({
        userId: testUserData.user.id,
        date: oldDate.toISOString().split('T')[0],
        score: 8,
        notes: null,
      });
      await painScoreRepository.save(oldPainScore);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/dashboard/pain-progression').expect(200);

      expect(response.body.dataPoints).toHaveLength(1);
      expect(response.body.dataPoints[0].score).toBe(5);
    });

    it('should return data sorted by date ascending', async () => {
      const painScoreRepository = dataSource.getRepository(PainScore);

      const today = new Date();
      const dates = [
        new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
        new Date(today.getTime() - 50 * 24 * 60 * 60 * 1000),
        new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
      ];

      // Create in non-sorted order
      for (const date of dates) {
        const painScore = painScoreRepository.create({
          userId: testUserData.user.id,
          date: date.toISOString().split('T')[0],
          score: 5,
          notes: null,
        });
        await painScoreRepository.save(painScore);
      }

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/dashboard/pain-progression').expect(200);

      expect(response.body.dataPoints).toHaveLength(3);
      // Verify dates are in ascending order
      const responseDates = response.body.dataPoints.map((dp: { date: string }) =>
        new Date(dp.date).getTime()
      );
      for (let i = 1; i < responseDates.length; i++) {
        expect(responseDates[i]).toBeGreaterThan(responseDates[i - 1]);
      }
    });
  });

  describe('GET /api/dashboard/sleep-progression', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/dashboard/sleep-progression').expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return empty array when no sleep scores exist', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/dashboard/sleep-progression').expect(200);
      expect(response.body.dataPoints).toEqual([]);
    });

    it('should return sleep progression data for last 12 weeks', async () => {
      const sleepScoreRepository = dataSource.getRepository(SleepScore);

      const today = new Date();
      const dates = [
        new Date(today.getTime() - 70 * 24 * 60 * 60 * 1000),
        new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000),
        new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
      ];

      const scores = [2, 3, 4];

      for (let i = 0; i < dates.length; i++) {
        const sleepScore = sleepScoreRepository.create({
          userId: testUserData.user.id,
          date: dates[i].toISOString().split('T')[0],
          score: scores[i],
          notes: null,
        });
        await sleepScoreRepository.save(sleepScore);
      }

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/dashboard/sleep-progression').expect(200);

      expect(response.body.dataPoints).toHaveLength(3);
      expect(response.body.dataPoints[0].score).toBe(2);
      expect(response.body.dataPoints[1].score).toBe(3);
      expect(response.body.dataPoints[2].score).toBe(4);
    });

    it('should only return data from last 84 days', async () => {
      const sleepScoreRepository = dataSource.getRepository(SleepScore);

      const today = new Date();

      // Sleep score within 84 days
      const recentDate = new Date(today.getTime() - 50 * 24 * 60 * 60 * 1000);
      const recentSleepScore = sleepScoreRepository.create({
        userId: testUserData.user.id,
        date: recentDate.toISOString().split('T')[0],
        score: 4,
        notes: null,
      });
      await sleepScoreRepository.save(recentSleepScore);

      // Sleep score older than 84 days
      const oldDate = new Date(today.getTime() - 100 * 24 * 60 * 60 * 1000);
      const oldSleepScore = sleepScoreRepository.create({
        userId: testUserData.user.id,
        date: oldDate.toISOString().split('T')[0],
        score: 2,
        notes: null,
      });
      await sleepScoreRepository.save(oldSleepScore);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/dashboard/sleep-progression').expect(200);

      expect(response.body.dataPoints).toHaveLength(1);
      expect(response.body.dataPoints[0].score).toBe(4);
    });

    it('should return data sorted by date ascending', async () => {
      const sleepScoreRepository = dataSource.getRepository(SleepScore);

      const today = new Date();
      const dates = [
        new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
        new Date(today.getTime() - 50 * 24 * 60 * 60 * 1000),
        new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
      ];

      // Create in non-sorted order
      for (const date of dates) {
        const sleepScore = sleepScoreRepository.create({
          userId: testUserData.user.id,
          date: date.toISOString().split('T')[0],
          score: 3,
          notes: null,
        });
        await sleepScoreRepository.save(sleepScore);
      }

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/dashboard/sleep-progression').expect(200);

      expect(response.body.dataPoints).toHaveLength(3);
      // Verify dates are in ascending order
      const responseDates = response.body.dataPoints.map((dp: { date: string }) =>
        new Date(dp.date).getTime()
      );
      for (let i = 1; i < responseDates.length; i++) {
        expect(responseDates[i]).toBeGreaterThan(responseDates[i - 1]);
      }
    });
  });
});
