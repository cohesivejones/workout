import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import dataSource from '../../data-source';
import { Meal } from '../../entities';
import mealsRouter from '../../routes/meals.routes';
import {
  createTestApp,
  createTestUser,
  cleanupTestUser,
  cleanupUserData,
  authenticatedRequest,
  TestUserData,
} from '../helpers';

describe('Meal API Routes', () => {
  let app: express.Application;
  let testUserData: TestUserData;

  beforeAll(async () => {
    app = createTestApp([{ path: '/api/meals', router: mealsRouter }]);
    testUserData = await createTestUser('meal-test@example.com', 'Meal Test User');
  });

  afterAll(async () => {
    await cleanupUserData(testUserData.user.id);
    await cleanupTestUser(testUserData.user);
  });

  beforeEach(async () => {
    await cleanupUserData(testUserData.user.id, { meals: true });
  });

  describe('POST /api/meals', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/meals')
        .send({
          date: '2024-01-15',
          description: 'Test Meal',
          calories: 500,
          protein: 30,
          carbs: 50,
          fat: 20,
        })
        .expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should create a new meal', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/meals')
        .send({
          date: '2024-01-15',
          description: 'Chicken and Rice',
          calories: 650,
          protein: 45,
          carbs: 70,
          fat: 15,
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.date).toBe('2024-01-15');
      expect(response.body.description).toBe('Chicken and Rice');
      expect(parseFloat(response.body.calories)).toBe(650);
      expect(parseFloat(response.body.protein)).toBe(45);
      expect(parseFloat(response.body.carbs)).toBe(70);
      expect(parseFloat(response.body.fat)).toBe(15);
      expect(response.body.userId).toBe(testUserData.user.id);
    });

    it('should reject meal with negative calories', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/meals')
        .send({
          date: '2024-01-15',
          description: 'Invalid Meal',
          calories: -100,
          protein: 10,
          carbs: 20,
          fat: 5,
        })
        .expect(400);
      expect(response.body.error).toContain('positive');
    });

    it('should reject meal with negative macros', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/meals')
        .send({
          date: '2024-01-15',
          description: 'Invalid Meal',
          calories: 100,
          protein: -10,
          carbs: 20,
          fat: 5,
        })
        .expect(400);
      expect(response.body.error).toContain('positive');
    });
  });

  describe('GET /api/meals/:id', () => {
    it('should require authentication', async () => {
      const repo = dataSource.getRepository(Meal);
      const meal = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        description: 'Test Meal',
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
      });
      await repo.save(meal);

      const response = await request(app).get(`/api/meals/${meal.id}`).expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent id', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/meals/99999').expect(404);
      expect(response.body.error).toBe('Meal not found');
    });

    it('should fetch existing meal', async () => {
      const repo = dataSource.getRepository(Meal);
      const meal = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        description: 'Breakfast - Oats',
        calories: 400,
        protein: 15,
        carbs: 65,
        fat: 10,
      });
      await repo.save(meal);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get(`/api/meals/${meal.id}`).expect(200);
      expect(response.body.id).toBe(meal.id);
      expect(response.body.description).toBe('Breakfast - Oats');
      expect(parseFloat(response.body.calories)).toBe(400);
    });
  });

  describe('PUT /api/meals/:id', () => {
    it('should require authentication', async () => {
      const repo = dataSource.getRepository(Meal);
      const meal = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        description: 'Test Meal',
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
      });
      await repo.save(meal);

      const response = await request(app)
        .put(`/api/meals/${meal.id}`)
        .send({
          date: '2024-01-15',
          description: 'Updated Meal',
          calories: 600,
          protein: 35,
          carbs: 55,
          fat: 25,
        })
        .expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent meal', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .put('/api/meals/99999')
        .send({
          date: '2024-01-15',
          description: 'Updated Meal',
          calories: 600,
          protein: 35,
          carbs: 55,
          fat: 25,
        })
        .expect(404);
      expect(response.body.error).toBe('Meal not found');
    });

    it('should reject negative values', async () => {
      const repo = dataSource.getRepository(Meal);
      const meal = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        description: 'Test Meal',
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
      });
      await repo.save(meal);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .put(`/api/meals/${meal.id}`)
        .send({
          date: '2024-01-15',
          description: 'Updated Meal',
          calories: -100,
          protein: 35,
          carbs: 55,
          fat: 25,
        })
        .expect(400);
      expect(response.body.error).toContain('positive');
    });

    it('should update existing meal', async () => {
      const repo = dataSource.getRepository(Meal);
      const meal = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        description: 'Original Meal',
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
      });
      await repo.save(meal);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .put(`/api/meals/${meal.id}`)
        .send({
          date: '2024-01-16',
          description: 'Updated Meal',
          calories: 750,
          protein: 40,
          carbs: 80,
          fat: 25,
        })
        .expect(200);

      expect(response.body.date).toBe('2024-01-16');
      expect(response.body.description).toBe('Updated Meal');
      expect(parseFloat(response.body.calories)).toBe(750);
      expect(parseFloat(response.body.protein)).toBe(40);
      expect(parseFloat(response.body.carbs)).toBe(80);
      expect(parseFloat(response.body.fat)).toBe(25);
    });
  });

  describe('GET /api/meals/search', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/meals/search?q=chicken').expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return empty array for empty query', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/meals/search?q=').expect(200);
      expect(response.body).toEqual([]);
    });

    it('should return empty array when no meals match', async () => {
      const repo = dataSource.getRepository(Meal);
      await repo.save(
        repo.create({
          userId: testUserData.user.id,
          date: '2024-01-15',
          description: 'Chicken and Rice',
          calories: 650,
          protein: 45,
          carbs: 70,
          fat: 15,
        })
      );

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/meals/search?q=pizza').expect(200);
      expect(response.body).toEqual([]);
    });

    it('should search meals by description (case insensitive)', async () => {
      const repo = dataSource.getRepository(Meal);
      await repo.save(
        repo.create({
          userId: testUserData.user.id,
          date: '2024-01-15',
          description: 'Chicken and Rice',
          calories: 650,
          protein: 45,
          carbs: 70,
          fat: 15,
        })
      );
      await repo.save(
        repo.create({
          userId: testUserData.user.id,
          date: '2024-01-16',
          description: 'Grilled Chicken Salad',
          calories: 400,
          protein: 40,
          carbs: 20,
          fat: 15,
        })
      );
      await repo.save(
        repo.create({
          userId: testUserData.user.id,
          date: '2024-01-17',
          description: 'Breakfast - Oats',
          calories: 300,
          protein: 10,
          carbs: 50,
          fat: 8,
        })
      );

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/meals/search?q=chicken').expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].description).toContain('Chicken');
      expect(response.body[1].description).toContain('Chicken');
    });

    it('should return most recent version of duplicate meal descriptions', async () => {
      const repo = dataSource.getRepository(Meal);

      // Create older version
      await repo.save(
        repo.create({
          userId: testUserData.user.id,
          date: '2024-01-10',
          description: 'Chicken and Rice',
          calories: 600,
          protein: 40,
          carbs: 65,
          fat: 18,
        })
      );

      // Create newer version with same description
      const newerMeal = await repo.save(
        repo.create({
          userId: testUserData.user.id,
          date: '2024-01-15',
          description: 'Chicken and Rice',
          calories: 650,
          protein: 45,
          carbs: 70,
          fat: 15,
        })
      );

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/meals/search?q=chicken').expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(newerMeal.id);
      expect(parseFloat(response.body[0].calories)).toBe(650);
    });

    it('should limit results to 10 meals', async () => {
      const repo = dataSource.getRepository(Meal);

      // Create 15 meals with "Meal" in the description
      for (let i = 1; i <= 15; i++) {
        await repo.save(
          repo.create({
            userId: testUserData.user.id,
            date: '2024-01-15',
            description: `Meal ${i}`,
            calories: 500,
            protein: 30,
            carbs: 50,
            fat: 20,
          })
        );
      }

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/meals/search?q=meal').expect(200);

      expect(response.body.length).toBeLessThanOrEqual(10);
    });

    it('should only return meals for authenticated user', async () => {
      const repo = dataSource.getRepository(Meal);

      // Create meal for test user
      await repo.save(
        repo.create({
          userId: testUserData.user.id,
          date: '2024-01-15',
          description: 'My Chicken Meal',
          calories: 650,
          protein: 45,
          carbs: 70,
          fat: 15,
        })
      );

      // Create meal for different user
      const otherUser = await createTestUser('other-meal-test@example.com', 'Other User');
      await repo.save(
        repo.create({
          userId: otherUser.user.id,
          date: '2024-01-15',
          description: 'Other User Chicken Meal',
          calories: 500,
          protein: 30,
          carbs: 50,
          fat: 20,
        })
      );

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/meals/search?q=chicken').expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].description).toBe('My Chicken Meal');
      expect(response.body[0].userId).toBe(testUserData.user.id);

      // Cleanup other user
      await cleanupUserData(otherUser.user.id);
      await cleanupTestUser(otherUser.user);
    });
  });

  describe('DELETE /api/meals/:id', () => {
    it('should require authentication', async () => {
      const repo = dataSource.getRepository(Meal);
      const meal = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        description: 'Test Meal',
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
      });
      await repo.save(meal);

      const response = await request(app).delete(`/api/meals/${meal.id}`).expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent meal', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.delete('/api/meals/99999').expect(404);
      expect(response.body.error).toBe('Meal not found');
    });

    it('should delete existing meal', async () => {
      const repo = dataSource.getRepository(Meal);
      const meal = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        description: 'Dinner - Pasta',
        calories: 700,
        protein: 30,
        carbs: 90,
        fat: 20,
      });
      await repo.save(meal);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.delete(`/api/meals/${meal.id}`).expect(200);
      expect(response.body.id).toBe(meal.id);

      const remaining = await repo.findOne({ where: { id: meal.id } });
      expect(remaining).toBeNull();
    });
  });
});
