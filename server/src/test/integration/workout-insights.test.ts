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

    it('should create session and return data count for initial question', async () => {
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

    it('should require timeframe for initial question (no sessionId)', async () => {
      const response = await request(app)
        .post('/api/workout-insights/ask')
        .set('Cookie', [`token=${testUserData.authToken}`])
        .send({ question: 'Test question' }); // No timeframe or sessionId

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Timeframe is required');
    });

    it('should handle follow-up question with existing sessionId', async () => {
      // First create a session
      const initialResponse = await request(app)
        .post('/api/workout-insights/ask')
        .set('Cookie', [`token=${testUserData.authToken}`])
        .send({ question: 'What exercises am I improving at?', timeframe: '30d' });

      expect(initialResponse.status).toBe(200);
      const { sessionId } = initialResponse.body;

      // Now send a follow-up question
      const followUpResponse = await request(app)
        .post('/api/workout-insights/ask')
        .set('Cookie', [`token=${testUserData.authToken}`])
        .send({ question: 'Tell me more about my bench press', sessionId });

      expect(followUpResponse.status).toBe(200);
      expect(followUpResponse.body.sessionId).toBe(sessionId); // Same session
      expect(followUpResponse.body).not.toHaveProperty('dataCount'); // No data count for follow-ups
    });

    it('should reject follow-up with invalid sessionId', async () => {
      const response = await request(app)
        .post('/api/workout-insights/ask')
        .set('Cookie', [`token=${testUserData.authToken}`])
        .send({ question: 'Follow-up question', sessionId: 'invalid-session-id' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Session not found');
    });

    it("should reject follow-up to another user's session", async () => {
      // Create a session with the test user
      const initialResponse = await request(app)
        .post('/api/workout-insights/ask')
        .set('Cookie', [`token=${testUserData.authToken}`])
        .send({ question: 'Initial question', timeframe: '30d' });

      const { sessionId } = initialResponse.body;

      // Create another user
      const otherUser = await createTestUser();

      // Try to use the session with a different user
      const followUpResponse = await request(app)
        .post('/api/workout-insights/ask')
        .set('Cookie', [`token=${otherUser.authToken}`])
        .send({ question: 'Follow-up', sessionId });

      expect(followUpResponse.status).toBe(403);
      expect(followUpResponse.body.error).toContain('Unauthorized');

      // Cleanup
      await cleanupTestUser(otherUser.user);
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

    it('should stream AI response for follow-up questions through existing SSE connection', async () => {
      // First create a session
      const createResponse = await request(app)
        .post('/api/workout-insights/ask')
        .set('Cookie', [`token=${testUserData.authToken}`])
        .send({ question: 'What is my progress?', timeframe: '30d' });

      const { sessionId } = createResponse.body;

      return new Promise<void>((resolve, reject) => {
        const receivedEvents: string[] = [];
        let initialResponseComplete = false;

        // Open SSE connection
        const sseRequest = request(app)
          .get(`/api/workout-insights/stream/${sessionId}`)
          .set('Cookie', [`token=${testUserData.authToken}`])
          .buffer(false)
          .ok(() => true);

        sseRequest.on('response', (res) => {
          res.on('data', (chunk: Buffer) => {
            const data = chunk.toString();
            const lines = data.split('\n\n');

            lines.forEach((line: string) => {
              if (line.startsWith('data: ')) {
                try {
                  const eventData = JSON.parse(line.slice(6));
                  receivedEvents.push(eventData.type);

                  // After initial response completes, send a follow-up
                  if (eventData.type === 'complete' && !initialResponseComplete) {
                    initialResponseComplete = true;

                    // Send follow-up question
                    request(app)
                      .post('/api/workout-insights/ask')
                      .set('Cookie', [`token=${testUserData.authToken}`])
                      .send({ question: 'Tell me more', sessionId })
                      .then((followUpRes) => {
                        expect(followUpRes.status).toBe(200);
                      })
                      .catch(reject);
                  }

                  // Verify we get a second response after follow-up
                  if (
                    eventData.type === 'complete' &&
                    initialResponseComplete &&
                    receivedEvents.filter((e) => e === 'complete').length === 2
                  ) {
                    // We received two complete responses on the same connection
                    expect(receivedEvents).toContain('connected');
                    expect(receivedEvents).toContain('thinking');
                    expect(receivedEvents).toContain('content');
                    expect(receivedEvents.filter((e) => e === 'complete').length).toBe(2);

                    res.destroy();
                    resolve();
                  }
                } catch {
                  // Ignore parse errors for non-JSON lines
                }
              }
            });
          });

          res.on('error', (err) => {
            if (err.code !== 'ECONNRESET') {
              reject(err);
            }
          });
        });

        sseRequest.on('error', (err) => {
          if (err.code !== 'ECONNRESET') {
            reject(err);
          }
        });

        // Set timeout to fail the test if it takes too long
        setTimeout(() => {
          reject(new Error('Test timeout: SSE follow-up response not received'));
        }, 10000);

        sseRequest.end();
      });
    });
  });
});
