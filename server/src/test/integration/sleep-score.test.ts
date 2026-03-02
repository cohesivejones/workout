import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import dataSource from '../../data-source';
import { SleepScore } from '../../entities';
import sleepScoresRouter from '../../routes/sleep-scores.routes';
import {
  createTestApp,
  createTestUser,
  cleanupTestUser,
  cleanupUserData,
  authenticatedRequest,
  TestUserData,
} from '../helpers';

describe('Sleep Score API Routes', () => {
  let app: express.Application;
  let testUserData: TestUserData;

  beforeAll(async () => {
    app = createTestApp([{ path: '/api/sleep-scores', router: sleepScoresRouter }]);
    testUserData = await createTestUser('sleep-score-test@example.com', 'Sleep Score Test User');
  });

  afterAll(async () => {
    await cleanupUserData(testUserData.user.id);
    await cleanupTestUser(testUserData.user);
  });

  beforeEach(async () => {
    await cleanupUserData(testUserData.user.id, { sleepScores: true });
  });

  describe('POST /api/sleep-scores', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/sleep-scores')
        .send({ date: '2024-01-15', score: 3 })
        .expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should create a new sleep score', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/sleep-scores')
        .send({ date: '2024-01-15', score: 4, notes: 'Slept ok' })
        .expect(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.date).toBe('2024-01-15');
      expect(response.body.score).toBe(4);
      expect(response.body.notes).toBe('Slept ok');
      expect(response.body.userId).toBe(testUserData.user.id);
    });

    it('should reject score outside 1-5 range (too low)', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/sleep-scores')
        .send({ date: '2024-01-15', score: 0 })
        .expect(400);
      expect(response.body.error).toBe('Sleep score must be between 1 and 5');
    });

    it('should reject score outside 1-5 range (too high)', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/sleep-scores')
        .send({ date: '2024-01-15', score: 6 })
        .expect(400);
      expect(response.body.error).toBe('Sleep score must be between 1 and 5');
    });

    it('should prevent duplicate sleep score for same date', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      await authReq.post('/api/sleep-scores').send({ date: '2024-01-15', score: 3 }).expect(200);
      const response = await authReq
        .post('/api/sleep-scores')
        .send({ date: '2024-01-15', score: 4 })
        .expect(400);
      expect(response.body.error).toBe('A sleep score already exists for this date');
    });
  });

  describe('GET /api/sleep-scores/:id', () => {
    it('should require authentication', async () => {
      const repo = dataSource.getRepository(SleepScore);
      const sleep = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        score: 3,
        notes: null,
      });
      await repo.save(sleep);
      const response = await request(app).get(`/api/sleep-scores/${sleep.id}`).expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent id', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/sleep-scores/99999').expect(404);
      expect(response.body.error).toBe('Sleep score not found');
    });

    it('should fetch existing sleep score', async () => {
      const repo = dataSource.getRepository(SleepScore);
      const sleep = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        score: 5,
        notes: 'Great',
      });
      await repo.save(sleep);
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get(`/api/sleep-scores/${sleep.id}`).expect(200);
      expect(response.body.id).toBe(sleep.id);
      expect(response.body.score).toBe(5);
      expect(response.body.notes).toBe('Great');
    });
  });

  describe('PUT /api/sleep-scores/:id', () => {
    it('should require authentication', async () => {
      const repo = dataSource.getRepository(SleepScore);
      const sleep = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        score: 2,
        notes: null,
      });
      await repo.save(sleep);
      const response = await request(app)
        .put(`/api/sleep-scores/${sleep.id}`)
        .send({ date: '2024-01-15', score: 3 })
        .expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent sleep score', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .put('/api/sleep-scores/99999')
        .send({ date: '2024-01-15', score: 3 })
        .expect(404);
      expect(response.body.error).toBe('Sleep score not found');
    });

    it('should reject invalid score', async () => {
      const repo = dataSource.getRepository(SleepScore);
      const sleep = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        score: 2,
        notes: null,
      });
      await repo.save(sleep);
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .put(`/api/sleep-scores/${sleep.id}`)
        .send({ date: '2024-01-15', score: 10 })
        .expect(400);
      expect(response.body.error).toBe('Sleep score must be between 1 and 5');
    });

    it('should update existing sleep score', async () => {
      const repo = dataSource.getRepository(SleepScore);
      const sleep = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        score: 1,
        notes: 'Bad',
      });
      await repo.save(sleep);
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .put(`/api/sleep-scores/${sleep.id}`)
        .send({ date: '2024-01-16', score: 4, notes: 'Improved' })
        .expect(200);
      expect(response.body.date).toBe('2024-01-16');
      expect(response.body.score).toBe(4);
      expect(response.body.notes).toBe('Improved');
    });

    it('should prevent duplicate date on update', async () => {
      const repo = dataSource.getRepository(SleepScore);
      const sleep1 = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        score: 2,
        notes: null,
      });
      const sleep2 = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-16',
        score: 3,
        notes: null,
      });
      await repo.save([sleep1, sleep2]);
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .put(`/api/sleep-scores/${sleep2.id}`)
        .send({ date: '2024-01-15', score: 4 })
        .expect(400);
      expect(response.body.error).toBe('A sleep score already exists for this date');
    });
  });

  describe('DELETE /api/sleep-scores/:id', () => {
    it('should require authentication', async () => {
      const repo = dataSource.getRepository(SleepScore);
      const sleep = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        score: 2,
        notes: null,
      });
      await repo.save(sleep);
      const response = await request(app).delete(`/api/sleep-scores/${sleep.id}`).expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent sleep score', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.delete('/api/sleep-scores/99999').expect(404);
      expect(response.body.error).toBe('Sleep score not found');
    });

    it('should delete existing sleep score', async () => {
      const repo = dataSource.getRepository(SleepScore);
      const sleep = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        score: 5,
        notes: null,
      });
      await repo.save(sleep);
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.delete(`/api/sleep-scores/${sleep.id}`).expect(200);
      expect(response.body.id).toBe(sleep.id);
      const remaining = await repo.findOne({ where: { id: sleep.id } });
      expect(remaining).toBeNull();
    });
  });
});
