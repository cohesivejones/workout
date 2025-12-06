import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import dataSource from '../../data-source';
import { User } from '../../entities';
import { generateToken } from '../../middleware/auth';
import * as bcrypt from 'bcrypt';
import workoutCoachRouter from '../../routes/workout-coach.routes';
import { sessionStore } from '../../services/sessionStore';

// Mock OpenAI to avoid hitting external API
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        exercises: [
          { name: 'Squats', reps: 12, weight: 140 },
          { name: 'Bench Press', reps: 10, weight: 155 },
          { name: 'Deadlifts', reps: 8, weight: 185 },
          { name: 'Pull-ups', reps: 12 },
          { name: 'Plank', reps: 1, time_seconds: 60 },
          { name: 'Lunges', reps: 10, weight: 50 },
        ],
      }),
    }),
  })),
}));

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/workout-coach', workoutCoachRouter);
  return app;
}

describe('Workout Coach API Routes', () => {
  let app: express.Application;
  let testUser: User;
  let authToken: string;

  beforeAll(async () => {
    app = createTestApp();

    const userRepository = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('testpass123', 10);

    testUser = userRepository.create({
      email: 'workout-coach-test@example.com',
      name: 'Workout Coach Test User',
      password: hashedPassword,
    });

    await userRepository.save(testUser);
    authToken = generateToken(testUser);
  });

  afterAll(async () => {
    if (testUser) {
      // Clean up all test data
      await dataSource.query(
        'DELETE FROM workout_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE "userId" = $1)',
        [testUser.id]
      );
      await dataSource.query('DELETE FROM workouts WHERE "userId" = $1', [testUser.id]);
      await dataSource.query('DELETE FROM exercises WHERE "userId" = $1', [testUser.id]);

      const userRepository = dataSource.getRepository(User);
      await userRepository.remove(testUser);
    }
  });

  beforeEach(async () => {
    // Clean up workouts before each test
    await dataSource.query(
      'DELETE FROM workout_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE "userId" = $1)',
      [testUser.id]
    );
    await dataSource.query('DELETE FROM workouts WHERE "userId" = $1', [testUser.id]);
    await dataSource.query('DELETE FROM exercises WHERE "userId" = $1', [testUser.id]);
  });

  describe('POST /api/workout-coach/start', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/workout-coach/start')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should create a new session and return session ID', async () => {
      const response = await request(app)
        .post('/api/workout-coach/start')
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body.sessionId).toBeDefined();
      expect(typeof response.body.sessionId).toBe('string');
      expect(response.body.message).toBe('Session created');
    });

    it('should initialize session in session store', async () => {
      const response = await request(app)
        .post('/api/workout-coach/start')
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      const sessionId = response.body.sessionId;
      const session = sessionStore.get(sessionId);

      expect(session).toBeDefined();
      expect(session!.userId).toBe(testUser.id);
      expect(session!.messages).toEqual([]);
      expect(session!.regenerationCount).toBe(0);
      expect(session!.currentWorkoutPlan).toBeNull();
      expect(session!.userResponse).toBeNull();
    });

    it('should create unique session IDs for multiple requests', async () => {
      const response1 = await request(app)
        .post('/api/workout-coach/start')
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      const response2 = await request(app)
        .post('/api/workout-coach/start')
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response1.body.sessionId).not.toBe(response2.body.sessionId);

      // Both sessions should exist
      expect(sessionStore.get(response1.body.sessionId)).toBeDefined();
      expect(sessionStore.get(response2.body.sessionId)).toBeDefined();
    });
  });

  describe('POST /api/workout-coach/respond', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create a session for each test
      const response = await request(app)
        .post('/api/workout-coach/start')
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      sessionId = response.body.sessionId;
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/workout-coach/respond')
        .send({ sessionId, response: 'yes' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should require sessionId', async () => {
      const response = await request(app)
        .post('/api/workout-coach/respond')
        .set('Cookie', [`token=${authToken}`])
        .send({ response: 'yes' })
        .expect(400);

      expect(response.body.error).toBe('Session ID is required');
    });

    it('should require response', async () => {
      const response = await request(app)
        .post('/api/workout-coach/respond')
        .set('Cookie', [`token=${authToken}`])
        .send({ sessionId })
        .expect(400);

      expect(response.body.error).toBe('Response is required');
    });

    it('should validate response is yes or no', async () => {
      const response = await request(app)
        .post('/api/workout-coach/respond')
        .set('Cookie', [`token=${authToken}`])
        .send({ sessionId, response: 'maybe' })
        .expect(400);

      expect(response.body.error).toBe('Response must be "yes" or "no"');
    });

    it('should return error if session not found', async () => {
      const response = await request(app)
        .post('/api/workout-coach/respond')
        .set('Cookie', [`token=${authToken}`])
        .send({ sessionId: 'non-existent-session', response: 'yes' })
        .expect(404);

      expect(response.body.error).toBe('Session not found');
    });

    it('should update session with "yes" response', async () => {
      const response = await request(app)
        .post('/api/workout-coach/respond')
        .set('Cookie', [`token=${authToken}`])
        .send({ sessionId, response: 'yes' })
        .expect(200);

      expect(response.body.message).toBe('Response recorded');

      const session = sessionStore.get(sessionId);
      expect(session!.userResponse).toBe('yes');
      expect(session!.regenerationCount).toBe(0); // Should not increment for yes
    });

    it('should update session with "no" response and increment regeneration count', async () => {
      const response = await request(app)
        .post('/api/workout-coach/respond')
        .set('Cookie', [`token=${authToken}`])
        .send({ sessionId, response: 'no' })
        .expect(200);

      expect(response.body.message).toBe('Response recorded');

      const session = sessionStore.get(sessionId);
      expect(session!.userResponse).toBe('no');
      expect(session!.regenerationCount).toBe(1);
    });

    it('should increment regeneration count for multiple "no" responses', async () => {
      // First no
      await request(app)
        .post('/api/workout-coach/respond')
        .set('Cookie', [`token=${authToken}`])
        .send({ sessionId, response: 'no' })
        .expect(200);

      let session = sessionStore.get(sessionId);
      expect(session!.regenerationCount).toBe(1);

      // Second no
      await request(app)
        .post('/api/workout-coach/respond')
        .set('Cookie', [`token=${authToken}`])
        .send({ sessionId, response: 'no' })
        .expect(200);

      session = sessionStore.get(sessionId);
      expect(session!.regenerationCount).toBe(2);

      // Third no
      await request(app)
        .post('/api/workout-coach/respond')
        .set('Cookie', [`token=${authToken}`])
        .send({ sessionId, response: 'no' })
        .expect(200);

      session = sessionStore.get(sessionId);
      expect(session!.regenerationCount).toBe(3);
    });

    it('should verify user owns the session', async () => {
      // Create another user
      const userRepository = dataSource.getRepository(User);
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const otherUser = userRepository.create({
        email: 'other-user@example.com',
        name: 'Other User',
        password: hashedPassword,
      });

      await userRepository.save(otherUser);
      const otherAuthToken = generateToken(otherUser);

      // Try to respond to session owned by testUser using otherUser's token
      const response = await request(app)
        .post('/api/workout-coach/respond')
        .set('Cookie', [`token=${otherAuthToken}`])
        .send({ sessionId, response: 'yes' })
        .expect(403);

      expect(response.body.error).toBe('Unauthorized');

      // Clean up other user
      await userRepository.remove(otherUser);
    });
  });

  describe('GET /api/workout-coach/stream/:sessionId', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create a session for each test
      const response = await request(app)
        .post('/api/workout-coach/start')
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      sessionId = response.body.sessionId;
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/workout-coach/stream/${sessionId}`)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return error if session not found', async () => {
      const response = await request(app)
        .get('/api/workout-coach/stream/non-existent-session')
        .set('Cookie', [`token=${authToken}`])
        .expect(404);

      expect(response.body.error).toBe('Session not found');
    });

    it('should set SSE headers', async () => {
      // Test SSE headers by making request and checking response before timeout
      return new Promise<void>((resolve, reject) => {
        request(app)
          .get(`/api/workout-coach/stream/${sessionId}`)
          .set('Cookie', [`token=${authToken}`])
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
              console.error('SSE headers test error (catch):', error);
              res.destroy();
              reject(error);
            }
          })
          .on('error', (error) => {
            console.error('SSE headers test error (error):', error);
            // Ignore ECONNRESET which happens when we destroy the connection
            if (error.message.includes('ECONNRESET')) {
              return;
            }
            reject(error);
          })
          .end();
      });
    });

    it('should send initial connection message', async () => {
      // Test that SSE sends initial connection event
      return new Promise<void>((resolve, reject) => {
        let data = '';

        request(app)
          .get(`/api/workout-coach/stream/${sessionId}`)
          .set('Cookie', [`token=${authToken}`])
          .buffer(false) // Don't buffer the response
          .ok(() => true) // Accept any status code
          .on('response', (res) => {
            res.on('data', (chunk: Buffer) => {
              data += chunk.toString();
              
              // Check for connection message
              if (data.includes('{"type":"connected"}')) {
                try {
                  expect(data).toContain('data: {"type":"connected"}');

                  res.destroy();
                  resolve();
                } catch (error) {
                  res.destroy();
                  reject(error);
                }
              }
            });
          })
          .on('error', (error) => {
            // Ignore ECONNRESET which happens when we destroy the connection
            if (error.message.includes('ECONNRESET')) {
              return;
            }

            reject(error);
          })
          .end();
      });
    });

    it('should verify user owns the session', async () => {
      // Create another user
      const userRepository = dataSource.getRepository(User);
      const hashedPassword = await bcrypt.hash('testpass123', 10);

      const otherUser = userRepository.create({
        email: 'other-user-stream@example.com',
        name: 'Other User',
        password: hashedPassword,
      });

      await userRepository.save(otherUser);
      const otherAuthToken = generateToken(otherUser);

      // Try to stream session owned by testUser using otherUser's token
      const response = await request(app)
        .get(`/api/workout-coach/stream/${sessionId}`)
        .set('Cookie', [`token=${otherAuthToken}`])
        .expect(403);

      expect(response.body.error).toBe('Unauthorized');

      // Clean up other user
      await userRepository.remove(otherUser);
    });
  });

  describe('Full workflow integration', () => {
    it('should support full workflow: start -> respond yes', async () => {
      // 1. Start session
      const startResponse = await request(app)
        .post('/api/workout-coach/start')
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      const sessionId = startResponse.body.sessionId;
      expect(sessionId).toBeDefined();

      // 2. Verify session was created
      let session = sessionStore.get(sessionId);
      expect(session).toBeDefined();
      expect(session!.userId).toBe(testUser.id);

      // 3. Simulate workout generation (would happen via stream in real workflow)
      const mockWorkoutPlan = {
        date: new Date().toISOString().split('T')[0],
        exercises: [
          { name: 'Squats', reps: 12, weight: 140 },
          { name: 'Bench Press', reps: 10, weight: 155 },
        ],
      };
      sessionStore.update(sessionId, { currentWorkoutPlan: mockWorkoutPlan });

      // 4. User responds yes
      const respondResponse = await request(app)
        .post('/api/workout-coach/respond')
        .set('Cookie', [`token=${authToken}`])
        .send({ sessionId, response: 'yes' })
        .expect(200);

      expect(respondResponse.body.message).toBe('Response recorded');

      // 5. Verify session state
      session = sessionStore.get(sessionId);
      expect(session!.userResponse).toBe('yes');
      expect(session!.currentWorkoutPlan).toEqual(mockWorkoutPlan);
      expect(session!.regenerationCount).toBe(0);
    });

    it('should support regeneration workflow: start -> no -> no -> yes', async () => {
      // 1. Start session
      const startResponse = await request(app)
        .post('/api/workout-coach/start')
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      const sessionId = startResponse.body.sessionId;

      // 2. First workout plan
      const workout1 = {
        date: new Date().toISOString().split('T')[0],
        exercises: [{ name: 'Squats', reps: 12, weight: 140 }],
      };
      sessionStore.update(sessionId, { currentWorkoutPlan: workout1 });

      // 3. User says no
      await request(app)
        .post('/api/workout-coach/respond')
        .set('Cookie', [`token=${authToken}`])
        .send({ sessionId, response: 'no' })
        .expect(200);

      let session = sessionStore.get(sessionId);
      expect(session!.regenerationCount).toBe(1);

      // 4. Second workout plan
      const workout2 = {
        date: new Date().toISOString().split('T')[0],
        exercises: [{ name: 'Deadlifts', reps: 5, weight: 225 }],
      };
      sessionStore.update(sessionId, {
        currentWorkoutPlan: workout2,
        userResponse: null,
      });

      // 5. User says no again
      await request(app)
        .post('/api/workout-coach/respond')
        .set('Cookie', [`token=${authToken}`])
        .send({ sessionId, response: 'no' })
        .expect(200);

      session = sessionStore.get(sessionId);
      expect(session!.regenerationCount).toBe(2);

      // 6. Third workout plan
      const workout3 = {
        date: new Date().toISOString().split('T')[0],
        exercises: [{ name: 'Bench Press', reps: 10, weight: 155 }],
      };
      sessionStore.update(sessionId, {
        currentWorkoutPlan: workout3,
        userResponse: null,
      });

      // 7. User says yes
      await request(app)
        .post('/api/workout-coach/respond')
        .set('Cookie', [`token=${authToken}`])
        .send({ sessionId, response: 'yes' })
        .expect(200);

      session = sessionStore.get(sessionId);
      expect(session!.userResponse).toBe('yes');
      expect(session!.regenerationCount).toBe(2);
      expect(session!.currentWorkoutPlan).toEqual(workout3);
    });

    it('should handle multiple concurrent sessions', async () => {
      // Create multiple sessions
      const session1Response = await request(app)
        .post('/api/workout-coach/start')
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      const session2Response = await request(app)
        .post('/api/workout-coach/start')
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      const sessionId1 = session1Response.body.sessionId;
      const sessionId2 = session2Response.body.sessionId;

      // Sessions should be independent
      expect(sessionId1).not.toBe(sessionId2);

      // Respond to session 1
      await request(app)
        .post('/api/workout-coach/respond')
        .set('Cookie', [`token=${authToken}`])
        .send({ sessionId: sessionId1, response: 'yes' })
        .expect(200);

      // Respond to session 2
      await request(app)
        .post('/api/workout-coach/respond')
        .set('Cookie', [`token=${authToken}`])
        .send({ sessionId: sessionId2, response: 'no' })
        .expect(200);

      // Verify independent states
      const session1 = sessionStore.get(sessionId1);
      const session2 = sessionStore.get(sessionId2);

      expect(session1!.userResponse).toBe('yes');
      expect(session1!.regenerationCount).toBe(0);

      expect(session2!.userResponse).toBe('no');
      expect(session2!.regenerationCount).toBe(1);
    });
  });
});
