import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  createTestApp,
  createTestUser,
  cleanupTestUser,
  authenticatedRequest,
  TestUserData,
} from '../helpers';

// Create mock completion function
const mockCreate = vi.fn();

// Mock OpenAI module before importing the router
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

// Import the router AFTER mocking
const mealNutritionAiRouter = await import('../../routes/meal-nutrition-ai.routes');

describe('Meal Nutrition AI API Routes', () => {
  let app: express.Application;
  let testUserData: TestUserData;

  beforeAll(async () => {
    app = createTestApp([
      { path: '/api/meal-nutrition-ai', router: mealNutritionAiRouter.default },
    ]);
    testUserData = await createTestUser('meal-ai-test@example.com', 'Meal AI Test User');
  });

  afterAll(async () => {
    await cleanupTestUser(testUserData.user);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/meal-nutrition-ai/analyze', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/meal-nutrition-ai/analyze')
        .send({ description: 'Chicken and rice' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject empty description', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/meal-nutrition-ai/analyze')
        .send({ description: '' })
        .expect(400);

      expect(response.body.error).toBe('Meal description is required');
    });

    it('should reject missing description', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.post('/api/meal-nutrition-ai/analyze').send({}).expect(400);

      expect(response.body.error).toBe('Meal description is required');
    });

    it('should analyze meal and return nutrition data', async () => {
      // Mock successful OpenAI response
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                calories: 650,
                protein: 45,
                carbs: 70,
                fat: 15,
              }),
            },
          },
        ],
      });

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/meal-nutrition-ai/analyze')
        .send({ description: 'Grilled chicken breast with rice and vegetables' })
        .expect(200);

      expect(response.body).toEqual({
        calories: 650,
        protein: 45,
        carbs: 70,
        fat: 15,
      });

      // Verify OpenAI was called with correct parameters
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('nutrition expert'),
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Grilled chicken breast with rice and vegetables'),
            }),
          ]),
        })
      );
    });

    it('should handle different meal descriptions', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                calories: 850,
                protein: 30,
                carbs: 100,
                fat: 35,
              }),
            },
          },
        ],
      });

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/meal-nutrition-ai/analyze')
        .send({ description: 'Large pepperoni pizza, 3 slices' })
        .expect(200);

      expect(response.body.calories).toBe(850);
      expect(response.body.protein).toBe(30);
      expect(response.body.carbs).toBe(100);
      expect(response.body.fat).toBe(35);
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('OpenAI API error'));

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/meal-nutrition-ai/analyze')
        .send({ description: 'Chicken salad' })
        .expect(500);

      expect(response.body.error).toBe('Failed to analyze meal nutrition. Please try again.');
    });

    it('should handle empty OpenAI response', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      });

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/meal-nutrition-ai/analyze')
        .send({ description: 'Toast with butter' })
        .expect(500);

      expect(response.body.error).toBe('Failed to analyze meal nutrition. Please try again.');
    });

    it('should handle invalid JSON response from OpenAI', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'This is not valid JSON',
            },
          },
        ],
      });

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/meal-nutrition-ai/analyze')
        .send({ description: 'Pasta carbonara' })
        .expect(500);

      expect(response.body.error).toBe('Failed to analyze meal nutrition. Please try again.');
    });

    it('should handle missing fields in OpenAI response', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                calories: 500,
                // Missing protein, carbs, fat
              }),
            },
          },
        ],
      });

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/meal-nutrition-ai/analyze')
        .send({ description: 'Fruit salad' })
        .expect(500);

      expect(response.body.error).toBe('Failed to analyze meal nutrition. Please try again.');
    });

    it('should handle non-numeric values in OpenAI response', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                calories: '500', // String instead of number
                protein: 20,
                carbs: 60,
                fat: 10,
              }),
            },
          },
        ],
      });

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/meal-nutrition-ai/analyze')
        .send({ description: 'Oatmeal with berries' })
        .expect(500);

      expect(response.body.error).toBe('Failed to analyze meal nutrition. Please try again.');
    });

    it('should accept descriptions with special characters', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                calories: 400,
                protein: 25,
                carbs: 45,
                fat: 12,
              }),
            },
          },
        ],
      });

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/meal-nutrition-ai/analyze')
        .send({ description: 'Açaí bowl with granola & honey (medium size)' })
        .expect(200);

      expect(response.body.calories).toBe(400);
    });
  });
});
