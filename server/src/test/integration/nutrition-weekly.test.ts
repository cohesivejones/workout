import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import dataSource from '../../data-source';
import { Meal, WeightEntry } from '../../entities';
import nutritionWeeklyRouter from '../../routes/nutrition-weekly.routes';
import {
  createTestApp,
  createTestUser,
  cleanupTestUser,
  cleanupUserData,
  authenticatedRequest,
  TestUserData,
} from '../helpers';
import { startOfWeek, addDays, format } from 'date-fns';

describe('Nutrition Weekly Summary API Routes', () => {
  let app: express.Application;
  let testUserData: TestUserData;

  beforeAll(async () => {
    app = createTestApp([{ path: '/api/nutrition', router: nutritionWeeklyRouter }]);
    testUserData = await createTestUser(
      'weekly-nutrition-test@example.com',
      'Weekly Nutrition Test User'
    );
  });

  afterAll(async () => {
    await cleanupUserData(testUserData.user.id);
    await cleanupTestUser(testUserData.user);
  });

  beforeEach(async () => {
    await cleanupUserData(testUserData.user.id, { meals: true, weightEntries: true });
  });

  describe('GET /api/nutrition/weekly-summary', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/nutrition/weekly-summary').expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return weekly summary for current week when no startDate provided', async () => {
      const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
      const sunday = addDays(monday, 6);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/nutrition/weekly-summary').expect(200);

      expect(response.body.weekStart).toBe(format(monday, 'yyyy-MM-dd'));
      expect(response.body.weekEnd).toBe(format(sunday, 'yyyy-MM-dd'));
      expect(response.body.dailyData).toHaveLength(7);

      // All days should have null values when no data exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response.body.dailyData.forEach((day: any) => {
        expect(day).toHaveProperty('date');
        expect(day.weight).toBeNull();
        expect(day.totalCalories).toBeNull();
        expect(day.totalProtein).toBeNull();
        expect(day.totalCarbs).toBeNull();
        expect(day.totalFat).toBeNull();
      });
    });

    it('should return weekly summary for specified startDate', async () => {
      const specificMonday = '2024-01-15'; // A Monday
      const sunday = '2024-01-21';

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/weekly-summary?startDate=${specificMonday}`)
        .expect(200);

      expect(response.body.weekStart).toBe(specificMonday);
      expect(response.body.weekEnd).toBe(sunday);
      expect(response.body.dailyData).toHaveLength(7);
    });

    it('should return 400 for invalid startDate format', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get('/api/nutrition/weekly-summary?startDate=invalid-date')
        .expect(400);
      expect(response.body.error).toContain('Invalid date');
    });

    it('should return 400 if startDate is not a Monday', async () => {
      const tuesday = '2024-01-16'; // A Tuesday

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/weekly-summary?startDate=${tuesday}`)
        .expect(400);
      expect(response.body.error).toContain('must be a Monday');
    });

    it('should aggregate meals for each day of the week', async () => {
      const monday = '2024-01-15';
      const repo = dataSource.getRepository(Meal);

      // Add meals for Monday (2 meals)
      await repo.save([
        repo.create({
          userId: testUserData.user.id,
          date: monday,
          description: 'Breakfast',
          calories: 400,
          protein: 20,
          carbs: 50,
          fat: 15,
        }),
        repo.create({
          userId: testUserData.user.id,
          date: monday,
          description: 'Lunch',
          calories: 600,
          protein: 40,
          carbs: 60,
          fat: 20,
        }),
      ]);

      // Add meal for Wednesday
      const wednesday = '2024-01-17';
      await repo.save(
        repo.create({
          userId: testUserData.user.id,
          date: wednesday,
          description: 'Dinner',
          calories: 800,
          protein: 50,
          carbs: 80,
          fat: 30,
        })
      );

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/weekly-summary?startDate=${monday}`)
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mondayData = response.body.dailyData.find((d: any) => d.date === monday);
      expect(mondayData.totalCalories).toBe(1000); // 400 + 600
      expect(mondayData.totalProtein).toBe(60); // 20 + 40
      expect(mondayData.totalCarbs).toBe(110); // 50 + 60
      expect(mondayData.totalFat).toBe(35); // 15 + 20

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wednesdayData = response.body.dailyData.find((d: any) => d.date === wednesday);
      expect(wednesdayData.totalCalories).toBe(800);
      expect(wednesdayData.totalProtein).toBe(50);
      expect(wednesdayData.totalCarbs).toBe(80);
      expect(wednesdayData.totalFat).toBe(30);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tuesdayData = response.body.dailyData.find((d: any) => d.date === '2024-01-16');
      expect(tuesdayData.totalCalories).toBeNull();
      expect(tuesdayData.totalProtein).toBeNull();
      expect(tuesdayData.totalCarbs).toBeNull();
      expect(tuesdayData.totalFat).toBeNull();
    });

    it('should include weight entries for each day of the week', async () => {
      const monday = '2024-01-15';
      const weightRepo = dataSource.getRepository(WeightEntry);

      // Add weight for Monday
      await weightRepo.save(
        weightRepo.create({
          userId: testUserData.user.id,
          date: monday,
          weight: 85.5,
        })
      );

      // Add weight for Friday
      const friday = '2024-01-19';
      await weightRepo.save(
        weightRepo.create({
          userId: testUserData.user.id,
          date: friday,
          weight: 84.8,
        })
      );

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/weekly-summary?startDate=${monday}`)
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mondayData = response.body.dailyData.find((d: any) => d.date === monday);
      expect(mondayData.weight).toBe(85.5);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fridayData = response.body.dailyData.find((d: any) => d.date === friday);
      expect(fridayData.weight).toBe(84.8);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tuesdayData = response.body.dailyData.find((d: any) => d.date === '2024-01-16');
      expect(tuesdayData.weight).toBeNull();
    });

    it('should combine meals and weight data correctly', async () => {
      const monday = '2024-01-15';
      const mealRepo = dataSource.getRepository(Meal);
      const weightRepo = dataSource.getRepository(WeightEntry);

      // Add both meal and weight for Monday
      await mealRepo.save(
        mealRepo.create({
          userId: testUserData.user.id,
          date: monday,
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
          date: monday,
          weight: 85.5,
        })
      );

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/weekly-summary?startDate=${monday}`)
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mondayData = response.body.dailyData.find((d: any) => d.date === monday);
      expect(mondayData.weight).toBe(85.5);
      expect(mondayData.totalCalories).toBe(400);
      expect(mondayData.totalProtein).toBe(20);
      expect(mondayData.totalCarbs).toBe(50);
      expect(mondayData.totalFat).toBe(15);
    });

    it('should only return data for authenticated user', async () => {
      const monday = '2024-01-15';
      const mealRepo = dataSource.getRepository(Meal);
      const weightRepo = dataSource.getRepository(WeightEntry);

      // Create data for test user
      await mealRepo.save(
        mealRepo.create({
          userId: testUserData.user.id,
          date: monday,
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
          date: monday,
          weight: 85.5,
        })
      );

      // Create data for different user
      const otherUser = await createTestUser('other-weekly-test@example.com', 'Other User');
      await mealRepo.save(
        mealRepo.create({
          userId: otherUser.user.id,
          date: monday,
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
          date: monday,
          weight: 90.0,
        })
      );

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/weekly-summary?startDate=${monday}`)
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mondayData = response.body.dailyData.find((d: any) => d.date === monday);
      expect(mondayData.weight).toBe(85.5);
      expect(mondayData.totalCalories).toBe(500);
      expect(mondayData.totalProtein).toBe(30);

      // Cleanup other user
      await cleanupUserData(otherUser.user.id);
      await cleanupTestUser(otherUser.user);
    });

    it('should handle weeks with no data', async () => {
      const monday = '2024-01-15';

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/weekly-summary?startDate=${monday}`)
        .expect(200);

      expect(response.body.dailyData).toHaveLength(7);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response.body.dailyData.forEach((day: any) => {
        expect(day.weight).toBeNull();
        expect(day.totalCalories).toBeNull();
        expect(day.totalProtein).toBeNull();
        expect(day.totalCarbs).toBeNull();
        expect(day.totalFat).toBeNull();
      });
    });

    it('should return dates in correct order (Monday to Sunday)', async () => {
      const monday = '2024-01-15';

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .get(`/api/nutrition/weekly-summary?startDate=${monday}`)
        .expect(200);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dates = response.body.dailyData.map((d: any) => d.date);
      expect(dates).toEqual([
        '2024-01-15', // Monday
        '2024-01-16', // Tuesday
        '2024-01-17', // Wednesday
        '2024-01-18', // Thursday
        '2024-01-19', // Friday
        '2024-01-20', // Saturday
        '2024-01-21', // Sunday
      ]);
    });
  });
});
