import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import dataSource from '../../data-source';
import { User, Workout, PainScore, SleepScore, WorkoutExercise, Exercise } from '../../entities';
import { generateToken } from '../../middleware/auth';
import * as bcrypt from 'bcrypt';
import activityRouter from '../../routes/activity.routes';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/activity', activityRouter);
  return app;
}

describe('Activity Feed API', () => {
  let app: express.Application;
  let testUser: User;
  let authToken: string;

  beforeAll(async () => {
    app = createTestApp();
    const userRepository = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    testUser = userRepository.create({ email: 'activity-test@example.com', name: 'Activity Test', password: hashedPassword });
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
      await dataSource.query('DELETE FROM pain_scores WHERE "userId" = $1', [testUser.id]);
      await dataSource.query('DELETE FROM sleep_scores WHERE "userId" = $1', [testUser.id]);
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
    await dataSource.query('DELETE FROM pain_scores WHERE "userId" = $1', [testUser.id]);
    await dataSource.query('DELETE FROM sleep_scores WHERE "userId" = $1', [testUser.id]);
  });

  it('requires authentication', async () => {
    await request(app).get('/api/activity').expect(401);
  });

  it('returns empty feed when no data', async () => {
    const res = await request(app)
      .get('/api/activity')
      .set('Cookie', [`token=${authToken}`])
      .expect(200);

    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.offset).toBe(0);
    expect(res.body.month).toBe(null);
  });

  it('returns most recent activity month by default (offset=0), ordered desc', async () => {
    const workoutRepo = dataSource.getRepository(Workout);
    const exerciseRepo = dataSource.getRepository(Exercise);
    const weRepo = dataSource.getRepository(WorkoutExercise);
    const painRepo = dataSource.getRepository(PainScore);

    const ex = exerciseRepo.create({ name: 'Bench Press', userId: testUser.id });
    await exerciseRepo.save(ex);

    const now = new Date();
    const futureMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const futureMonthStr = `${futureMonth.getFullYear()}-${String(futureMonth.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Create 3 items in future month (offset=0 should return this)
    for (let i = 1; i <= 3; i++) {
      const w = workoutRepo.create({ userId: testUser.id, date: `${futureMonthStr}-${String(i).padStart(2, '0')}`, withInstructor: false });
      await workoutRepo.save(w);
      const we = weRepo.create({ workout_id: w.id, exercise_id: ex.id, reps: 10, weight: 100 + i, time_seconds: null });
      await weRepo.save(we);
    }

    // Create 2 items this month
    for (let i = 1; i <= 2; i++) {
      const p = painRepo.create({ userId: testUser.id, date: `${thisMonthStr}-${String(i).padStart(2, '0')}`, score: 5, notes: null });
      await painRepo.save(p);
    }

    const res = await request(app)
      .get('/api/activity')
      .set('Cookie', [`token=${authToken}`])
      .expect(200);

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

  it('supports month-based pagination via offset (offset=1 => one month earlier)', async () => {
    const workoutRepo = dataSource.getRepository(Workout);
    const exerciseRepo = dataSource.getRepository(Exercise);
    const weRepo = dataSource.getRepository(WorkoutExercise);
    const sleepRepo = dataSource.getRepository(SleepScore);

    const ex = exerciseRepo.create({ name: 'Squat', userId: testUser.id });
    await exerciseRepo.save(ex);

    const now = new Date();
    const futureMonth = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const futureMonthStr = `${futureMonth.getFullYear()}-${String(futureMonth.getMonth() + 1).padStart(2, '0')}`;
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

    // 3 workouts in future month (2 months ahead)
    for (let i = 1; i <= 3; i++) {
      const w = workoutRepo.create({ userId: testUser.id, date: `${futureMonthStr}-${String(i).padStart(2, '0')}`, withInstructor: false });
      await workoutRepo.save(w);
      const we = weRepo.create({ workout_id: w.id, exercise_id: ex.id, reps: 10, weight: 100 + i, time_seconds: null });
      await weRepo.save(we);
    }

    // 4 sleep scores in next month (1 month ahead)
    for (let i = 1; i <= 4; i++) {
      const s = sleepRepo.create({ userId: testUser.id, date: `${nextMonthStr}-${String(i).padStart(2, '0')}`, score: 3, notes: null });
      await sleepRepo.save(s);
    }

    // offset=0 => most recent activity month (2 months ahead)
    const res1 = await request(app)
      .get('/api/activity?offset=0')
      .set('Cookie', [`token=${authToken}`])
      .expect(200);

    expect(res1.body.offset).toBe(0);
    expect(res1.body.month).toBe(futureMonthStr);
    expect(res1.body.items.length).toBe(3);

    // offset=1 => one month earlier (1 month ahead)
    const res2 = await request(app)
      .get('/api/activity?offset=1')
      .set('Cookie', [`token=${authToken}`])
      .expect(200);

    expect(res2.body.offset).toBe(1);
    expect(res2.body.month).toBe(nextMonthStr);
    expect(res2.body.items.length).toBe(4);

    // Ensure no overlap between months
    const ids1 = new Set(res1.body.items.map((i: { type: string; id: number }) => `${i.type}-${i.id}`));
    const ids2 = new Set(res2.body.items.map((i: { type: string; id: number }) => `${i.type}-${i.id}`));
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
