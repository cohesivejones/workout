import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import activityRouter from '../../routes/activity.routes';
import {
  createTestApp,
  createTestUser,
  cleanupTestUser,
  cleanupUserData,
  authenticatedRequest,
  createTestWorkoutWithExercises,
  createTestSleepScore,
  TestUserData,
} from '../helpers';

describe('Activity Feed API', () => {
  let app: express.Application;
  let testUserData: TestUserData;

  beforeAll(async () => {
    app = createTestApp([{ path: '/api/activity', router: activityRouter }]);
    testUserData = await createTestUser('activity-test@example.com', 'Activity Test');
  });

  afterAll(async () => {
    await cleanupUserData(testUserData.user.id);
    await cleanupTestUser(testUserData.user);
  });

  beforeEach(async () => {
    await cleanupUserData(testUserData.user.id);
  });

  it('requires authentication', async () => {
    await request(app).get('/api/activity').expect(401);
  });

  it('returns empty feed when no data', async () => {
    const authReq = authenticatedRequest(app, testUserData.authToken);
    const res = await authReq.get('/api/activity').expect(200);

    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.offset).toBe(0);
    expect(res.body.month).toBe(null);
  });

  it('returns most recent activity month by default (offset=0), ordered desc', async () => {
    const now = new Date();
    const futureMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const futureMonthStr = `${futureMonth.getFullYear()}-${String(futureMonth.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Create 3 items in future month (offset=0 should return this)
    for (let i = 1; i <= 3; i++) {
      await createTestWorkoutWithExercises(
        testUserData.user.id,
        { date: `${futureMonthStr}-${String(i).padStart(2, '0')}` },
        [{ name: 'Bench Press', reps: 10, weight: 100 + i }]
      );
    }

    // Create 2 items this month
    for (let i = 1; i <= 2; i++) {
      await createTestSleepScore(testUserData.user.id, {
        date: `${thisMonthStr}-${String(i).padStart(2, '0')}`,
        score: 3,
      });
    }

    const authReq = authenticatedRequest(app, testUserData.authToken);
    const res = await authReq.get('/api/activity').expect(200);

    expect(res.body.offset).toBe(0);
    expect(res.body.month).toBe(futureMonthStr);
    expect(res.body.total).toBe(5);
    expect(res.body.items.length).toBe(3); // Only future month's items

    // Verify ordering desc by date
    const dates = res.body.items.map((i: { date: string }) => i.date);
    const sorted = [...dates].sort().reverse();
    expect(dates).toEqual(sorted);

    // All items should be from future month
    for (const item of res.body.items) {
      expect(item.date.startsWith(futureMonthStr)).toBe(true);
    }

    // Spot-check enrichment
    const firstWorkout = res.body.items.find((i: { type: string }) => i.type === 'workout');
    if (firstWorkout) {
      expect(firstWorkout.workout).toBeDefined();
      expect(Array.isArray(firstWorkout.workout.exercises)).toBe(true);
    }
  });

  it('returns workout exercises with timeSeconds in camelCase', async () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;

    // Create a workout with time-based exercises
    await createTestWorkoutWithExercises(testUserData.user.id, { date: dateStr }, [
      { name: 'Plank', reps: 1, time_seconds: 60 },
      { name: 'Bench Press', reps: 10, weight: 135 },
      { name: 'Wall Sit', reps: 1, time_seconds: 45 },
    ]);

    const authReq = authenticatedRequest(app, testUserData.authToken);
    const res = await authReq.get('/api/activity').expect(200);

    expect(res.body.items.length).toBe(1);
    const activityItem = res.body.items[0];
    expect(activityItem.type).toBe('workout');
    expect(activityItem.workout).toBeDefined();
    expect(activityItem.workout.exercises).toHaveLength(3);

    // Check that timeSeconds is in camelCase, not snake_case
    const plankExercise = activityItem.workout.exercises.find(
      (e: { name: string }) => e.name === 'Plank'
    );
    expect(plankExercise).toBeDefined();
    expect(plankExercise.timeSeconds).toBe(60);

    const wallSitExercise = activityItem.workout.exercises.find(
      (e: { name: string }) => e.name === 'Wall Sit'
    );
    expect(wallSitExercise).toBeDefined();
    expect(wallSitExercise.timeSeconds).toBe(45);

    // Check that weight-based exercises have null timeSeconds
    const benchPressExercise = activityItem.workout.exercises.find(
      (e: { name: string }) => e.name === 'Bench Press'
    );
    expect(benchPressExercise).toBeDefined();
    expect(benchPressExercise.weight).toBe(135);
    expect(benchPressExercise.timeSeconds).toBeNull();
  });

  it('supports month-based pagination via offset (offset=1 => one month earlier)', async () => {
    const now = new Date();
    const futureMonth = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const futureMonthStr = `${futureMonth.getFullYear()}-${String(futureMonth.getMonth() + 1).padStart(2, '0')}`;
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

    // 3 workouts in future month (2 months ahead)
    for (let i = 1; i <= 3; i++) {
      await createTestWorkoutWithExercises(
        testUserData.user.id,
        { date: `${futureMonthStr}-${String(i).padStart(2, '0')}` },
        [{ name: 'Squat', reps: 10, weight: 100 + i }]
      );
    }

    // 4 sleep scores in next month (1 month ahead)
    for (let i = 1; i <= 4; i++) {
      await createTestSleepScore(testUserData.user.id, {
        date: `${nextMonthStr}-${String(i).padStart(2, '0')}`,
        score: 3,
      });
    }

    const authReq = authenticatedRequest(app, testUserData.authToken);

    // offset=0 => most recent activity month (2 months ahead)
    const res1 = await authReq.get('/api/activity?offset=0').expect(200);

    expect(res1.body.offset).toBe(0);
    expect(res1.body.month).toBe(futureMonthStr);
    expect(res1.body.items.length).toBe(3);

    // offset=1 => one month earlier (1 month ahead)
    const res2 = await authReq.get('/api/activity?offset=1').expect(200);

    expect(res2.body.offset).toBe(1);
    expect(res2.body.month).toBe(nextMonthStr);
    expect(res2.body.items.length).toBe(4);

    // Ensure no overlap between months
    const ids1 = new Set(
      res1.body.items.map((i: { type: string; id: number }) => `${i.type}-${i.id}`)
    );
    const ids2 = new Set(
      res2.body.items.map((i: { type: string; id: number }) => `${i.type}-${i.id}`)
    );
    for (const id of ids1) {
      expect(ids2.has(id)).toBe(false);
    }

    // Spot-check enrichment
    for (const item of res2.body.items) {
      if (item.type === 'workout') {
        expect(item.workout).toBeDefined();
      } else if (item.type === 'painScore') {
        expect(item.painScore).toBeDefined();
      } else if (item.type === 'sleepScore') {
        expect(item.sleepScore).toBeDefined();
      }
    }
  });
});
