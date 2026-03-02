import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import workoutInsightsRoutes from '../../routes/workout-insights.routes';
import { createTestApp, createTestUser, cleanupTestUser, TestUserData } from '../helpers';

// Mock OpenAI to avoid external API calls
vi.mock('../../services/openai', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          async *[Symbol.asyncIterator]() {
            yield {
              choices: [
                {
                  delta: { content: 'Based on your workout data, ' },
                },
              ],
            };
            yield {
              choices: [
                {
                  delta: { content: 'you are making great progress!' },
                },
              ],
            };
          },
        }),
      },
    },
  },
}));

describe('Workout Insights API', () => {
  let app: express.Application;
  let testUserData: TestUserData;

  beforeAll(async () => {
    app = createTestApp([{ path: '/api/workout-insights', router: workoutInsightsRoutes }]);
    testUserData = await createTestUser();
  });

  afterAll(async () => {
    await cleanupTestUser(testUserData.user);
  });

  describe('POST /api/workout-insights/ask', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/workout-insights/ask')
        .send({ question: 'Test question', timeframe: '30d' });

      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/workout-insights/ask')
        .set('Cookie', [`token=${testUserData.authToken}`])
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should validate timeframe format', async () => {
      const response = await request(app)
        .post('/api/workout-insights/ask')
        .set('Cookie', [`token=${testUserData.authToken}`])
        .send({ question: 'Test', timeframe: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('timeframe');
    });

    it('should create session and return data count', async () => {
      const response = await request(app)
        .post('/api/workout-insights/ask')
        .set('Cookie', [`token=${testUserData.authToken}`])
        .send({ question: 'What is my progress?', timeframe: '30d' });

      if (response.status !== 200) {
        console.log('Error response:', response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('dataCount');
      expect(response.body.dataCount).toHaveProperty('workouts');
      expect(response.body.dataCount).toHaveProperty('exercises');
      expect(response.body.dataCount).toHaveProperty('dateRange');
    });
  });

  describe('GET /api/workout-insights/stream/:sessionId', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/workout-insights/stream/test-session-123');

      expect(response.status).toBe(401);
    });

    it('should return 404 for invalid session', async () => {
      const response = await request(app)
        .get('/api/workout-insights/stream/invalid-session')
        .set('Cookie', [`token=${testUserData.authToken}`]);

      expect(response.status).toBe(404);
    });

    it('should set SSE headers', async () => {
      // First create a session
      const createResponse = await request(app)
        .post('/api/workout-insights/ask')
        .set('Cookie', [`token=${testUserData.authToken}`])
        .send({ question: 'Test', timeframe: '30d' });

      const { sessionId } = createResponse.body;

      // Test SSE headers by making request and checking response before timeout
      return new Promise<void>((resolve, reject) => {
        request(app)
          .get(`/api/workout-insights/stream/${sessionId}`)
          .set('Cookie', [`token=${testUserData.authToken}`])
          .buffer(false) // Don't buffer the response
          .ok(() => true) // Accept any status code so we can check headers
          .on('response', (res) => {
            try {
              // Check SSE headers
              expect(res.headers['content-type']).toBe('text/event-stream');
              expect(res.headers['cache-control']).toBe('no-cache');
              expect(res.headers['connection']).toBe('keep-alive');

              res.destroy(); // Close the connection
              resolve();
            } catch (error) {
              res.destroy();
              reject(error);
            }
          })
          .on('error', (err) => {
            // Ignore connection errors from destroying the response
            if (err.code !== 'ECONNRESET') {
              reject(err);
            } else {
              resolve(); // Connection was destroyed as expected
            }
          })
          .end();
      });
    });
  });
});
