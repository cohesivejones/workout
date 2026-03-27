import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import dataSource from '../../data-source';
import { Meal, WeightEntry } from '../../entities';
import nutritionMonthlyRouter from '../../routes/nutrition-monthly.routes';
import {
  createTestApp,
  createTestUser,
  cleanupTestUser,
  cleanupUserData,
  authenticatedRequest,
  TestUserData,
} from '../helpers';
import { createTestWorkoutWithExercises } from '../helpers/fixtures';
import { startOfMonth, endOfMonth, format } from 'date-fns';

describe('Nutrition Monthly Summary API Routes', () => {
  let app: express.Application;
  let testUserData: TestUserData;

  beforeAll(async () => {
    app = createTestApp([{ path: '/api/nutrition', router: nutritionMonthlyRouter }]);
    testUserData = await createTestUser(
      'monthly-nutrition-test@example.com',
      'Monthly Nutrition Test User'
    );
  });

  afterAll(async () => {
    await cleanupUserData(testUserData.user.id);
    await cleanupTestUser(testUserData.user);
  });

  beforeEach(async () => {
    await cleanupUserData(testUserData.user.id, {
      meals: true,
      weightEntries: true,
      workouts: true,
    });
  });

  describe('GET /api/nutrition/monthly-summary', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/nutrition/monthly-summary').expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return monthly summary for current month when no startDate provided', async () => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const daysInMonth = monthEnd.getDate();

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/nutrition/monthly-summary').expect(200);

      expect(response.body.monthStart).toBe(format(monthStart, 'yyyy-MM-dd'));
      expect(response.body.monthEnd).toBe(format(monthEnd, 'yyyy-MM-dd'));
      expect(response.body.dailyData).toHaveLength(daysInMonth);

      // All days should have null values when no data exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response.body.dailyData.forEach((day: any) => {
        expect(day).toHaveProperty('date');
        expect(day.weight).toBeNull();
        expect(day.totalCalories).toBeNull();
        expect(day.totalProtein).toBeNull();
        expect(day.totalCarbs).toBeNull();
        expect(day.totalFat).toBeNull();
        expect(day.workoutDay).toBe(false);
      });
    });

    it('should return monthly summary for specified startDate', async () => {
      const specificMonth = '2024-01-01'; // First day of January
      const monthEnd = '2024-01-31';

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/monthly-summary?startDate=${specificMonth}`)
        .expect(200);

      expect(response.body.monthStart).toBe(specificMonth);
      expect(response.body.monthEnd).toBe(monthEnd);
      expect(response.body.dailyData).toHaveLength(31); // January has 31 days
    });

    it('should return 400 for invalid startDate format', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get('/api/nutrition/monthly-summary?startDate=invalid-date')
        .expect(400);
      expect(response.body.error).toContain('Invalid date');
    });

    it('should return 400 if startDate is not the first day of a month', async () => {
      const notFirstDay = '2024-01-15'; // 15th day of month

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/monthly-summary?startDate=${notFirstDay}`)
        .expect(400);
      expect(response.body.error).toContain('must be the first day of a month');
    });

    it('should aggregate meals for each day of the month', async () => {
      const monthStart = '2024-01-01';
      const repo = dataSource.getRepository(Meal);

      // Add meals for January 1st (2 meals)
      await repo.save([
        repo.create({
          userId: testUserData.user.id,
          date: '2024-01-01',
          description: 'Breakfast',
          calories: 400,
          protein: 20,
          carbs: 50,
          fat: 15,
        }),
        repo.create({
          userId: testUserData.user.id,
          date: '2024-01-01',
          description: 'Lunch',
          calories: 600,
          protein: 40,
          carbs: 60,
          fat: 20,
        }),
      ]);

      // Add meal for January 15th
      await repo.save(
        repo.create({
          userId: testUserData.user.id,
          date: '2024-01-15',
          description: 'Dinner',
          calories: 800,
          protein: 50,
          carbs: 80,
          fat: 30,
        })
      );

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/monthly-summary?startDate=${monthStart}`)
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jan1Data = response.body.dailyData.find((d: any) => d.date === '2024-01-01');
      expect(jan1Data.totalCalories).toBe(1000); // 400 + 600
      expect(jan1Data.totalProtein).toBe(60); // 20 + 40
      expect(jan1Data.totalCarbs).toBe(110); // 50 + 60
      expect(jan1Data.totalFat).toBe(35); // 15 + 20

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jan15Data = response.body.dailyData.find((d: any) => d.date === '2024-01-15');
      expect(jan15Data.totalCalories).toBe(800);
      expect(jan15Data.totalProtein).toBe(50);
      expect(jan15Data.totalCarbs).toBe(80);
      expect(jan15Data.totalFat).toBe(30);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jan2Data = response.body.dailyData.find((d: any) => d.date === '2024-01-02');
      expect(jan2Data.totalCalories).toBeNull();
      expect(jan2Data.totalProtein).toBeNull();
      expect(jan2Data.totalCarbs).toBeNull();
      expect(jan2Data.totalFat).toBeNull();
    });

    it('should include weight entries for each day of the month', async () => {
      const monthStart = '2024-01-01';
      const weightRepo = dataSource.getRepository(WeightEntry);

      // Add weight for January 1st
      await weightRepo.save(
        weightRepo.create({
          userId: testUserData.user.id,
          date: '2024-01-01',
          weight: 85.5,
        })
      );

      // Add weight for January 20th
      await weightRepo.save(
        weightRepo.create({
          userId: testUserData.user.id,
          date: '2024-01-20',
          weight: 84.8,
        })
      );

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/monthly-summary?startDate=${monthStart}`)
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jan1Data = response.body.dailyData.find((d: any) => d.date === '2024-01-01');
      expect(jan1Data.weight).toBe(85.5);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jan20Data = response.body.dailyData.find((d: any) => d.date === '2024-01-20');
      expect(jan20Data.weight).toBe(84.8);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jan2Data = response.body.dailyData.find((d: any) => d.date === '2024-01-02');
      expect(jan2Data.weight).toBeNull();
    });

    it('should mark days with workouts as workoutDay: true', async () => {
      const monthStart = '2024-01-01';

      // Add workouts for January 1st and 15th
      await createTestWorkoutWithExercises(testUserData.user.id, { date: '2024-01-01' }, [
        { name: 'Bench Press', reps: 10, weight: 100 },
      ]);
      await createTestWorkoutWithExercises(testUserData.user.id, { date: '2024-01-15' }, [
        { name: 'Squats', reps: 12, weight: 105 },
      ]);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/monthly-summary?startDate=${monthStart}`)
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jan1Data = response.body.dailyData.find((d: any) => d.date === '2024-01-01');
      expect(jan1Data.workoutDay).toBe(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jan15Data = response.body.dailyData.find((d: any) => d.date === '2024-01-15');
      expect(jan15Data.workoutDay).toBe(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jan2Data = response.body.dailyData.find((d: any) => d.date === '2024-01-02');
      expect(jan2Data.workoutDay).toBe(false);
    });

    it('should mark day as workoutDay even with multiple exercises', async () => {
      const monthStart = '2024-01-01';

      // Add workout with multiple exercises on the same day
      await createTestWorkoutWithExercises(testUserData.user.id, { date: '2024-01-10' }, [
        { name: 'Bench Press', reps: 10, weight: 100 },
        { name: 'Squats', reps: 8, weight: 150 },
      ]);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/monthly-summary?startDate=${monthStart}`)
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jan10Data = response.body.dailyData.find((d: any) => d.date === '2024-01-10');
      expect(jan10Data.workoutDay).toBe(true);
    });

    it('should combine meals, weight data, and workout flags correctly', async () => {
      const monthStart = '2024-01-01';
      const mealRepo = dataSource.getRepository(Meal);
      const weightRepo = dataSource.getRepository(WeightEntry);

      // Add meal, weight, and workout for January 5th
      await mealRepo.save(
        mealRepo.create({
          userId: testUserData.user.id,
          date: '2024-01-05',
          description: 'Breakfast',
          calories: 400,
          protein: 20,
          carbs: 50,
          fat: 15,
        })
      );
      await weightRepo.save(
        weightRepo.create({
          userId: testUserData.user.id,
          date: '2024-01-05',
          weight: 85.5,
        })
      );
      await createTestWorkoutWithExercises(testUserData.user.id, { date: '2024-01-05' }, [
        { name: 'Deadlifts', reps: 5, weight: 200 },
      ]);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/monthly-summary?startDate=${monthStart}`)
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jan5Data = response.body.dailyData.find((d: any) => d.date === '2024-01-05');
      expect(jan5Data.weight).toBe(85.5);
      expect(jan5Data.totalCalories).toBe(400);
      expect(jan5Data.totalProtein).toBe(20);
      expect(jan5Data.totalCarbs).toBe(50);
      expect(jan5Data.totalFat).toBe(15);
      expect(jan5Data.workoutDay).toBe(true);
    });

    it('should only return data for authenticated user', async () => {
      const monthStart = '2024-01-01';
      const mealRepo = dataSource.getRepository(Meal);
      const weightRepo = dataSource.getRepository(WeightEntry);

      // Create data for test user
      await mealRepo.save(
        mealRepo.create({
          userId: testUserData.user.id,
          date: '2024-01-01',
          description: 'My Meal',
          calories: 500,
          protein: 30,
          carbs: 50,
          fat: 20,
        })
      );
      await weightRepo.save(
        weightRepo.create({
          userId: testUserData.user.id,
          date: '2024-01-01',
          weight: 85.5,
        })
      );
      await createTestWorkoutWithExercises(testUserData.user.id, { date: '2024-01-01' }, [
        { name: 'My Exercise', reps: 10, weight: 100 },
      ]);

      // Create data for different user
      const otherUser = await createTestUser('other-monthly-test@example.com', 'Other User');
      await mealRepo.save(
        mealRepo.create({
          userId: otherUser.user.id,
          date: '2024-01-01',
          description: 'Other Meal',
          calories: 1000,
          protein: 60,
          carbs: 100,
          fat: 40,
        })
      );
      await weightRepo.save(
        weightRepo.create({
          userId: otherUser.user.id,
          date: '2024-01-01',
          weight: 90.0,
        })
      );
      await createTestWorkoutWithExercises(otherUser.user.id, { date: '2024-01-01' }, [
        { name: 'Other Exercise', reps: 15, weight: 150 },
      ]);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/monthly-summary?startDate=${monthStart}`)
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jan1Data = response.body.dailyData.find((d: any) => d.date === '2024-01-01');
      expect(jan1Data.weight).toBe(85.5);
      expect(jan1Data.totalCalories).toBe(500);
      expect(jan1Data.totalProtein).toBe(30);
      expect(jan1Data.workoutDay).toBe(true);

      // Cleanup other user
      await cleanupUserData(otherUser.user.id);
      await cleanupTestUser(otherUser.user);
    });

    it('should handle months with no data', async () => {
      const monthStart = '2024-01-01';

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/monthly-summary?startDate=${monthStart}`)
        .expect(200);

      expect(response.body.dailyData).toHaveLength(31);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response.body.dailyData.forEach((day: any) => {
        expect(day.weight).toBeNull();
        expect(day.totalCalories).toBeNull();
        expect(day.totalProtein).toBeNull();
        expect(day.totalCarbs).toBeNull();
        expect(day.totalFat).toBeNull();
        expect(day.workoutDay).toBe(false);
      });
    });

    it('should return correct number of days for February (non-leap year)', async () => {
      const monthStart = '2023-02-01';

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/monthly-summary?startDate=${monthStart}`)
        .expect(200);

      expect(response.body.monthStart).toBe('2023-02-01');
      expect(response.body.monthEnd).toBe('2023-02-28');
      expect(response.body.dailyData).toHaveLength(28);
    });

    it('should return correct number of days for February (leap year)', async () => {
      const monthStart = '2024-02-01';

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/monthly-summary?startDate=${monthStart}`)
        .expect(200);

      expect(response.body.monthStart).toBe('2024-02-01');
      expect(response.body.monthEnd).toBe('2024-02-29');
      expect(response.body.dailyData).toHaveLength(29);
    });

    it('should return dates in correct order (1st to last day of month)', async () => {
      const monthStart = '2024-01-01';

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/monthly-summary?startDate=${monthStart}`)
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dates = response.body.dailyData.map((d: any) => d.date);
      expect(dates[0]).toBe('2024-01-01');
      expect(dates[30]).toBe('2024-01-31');
      expect(dates).toHaveLength(31);

      // Check all dates are sequential
      for (let i = 0; i < dates.length - 1; i++) {
        const current = new Date(dates[i]);
        const next = new Date(dates[i + 1]);
        expect(next.getTime() - current.getTime()).toBe(24 * 60 * 60 * 1000); // 1 day difference
      }
    });
  });
});
