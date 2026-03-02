import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import dataSource from '../../data-source';
import { PainScore } from '../../entities';
import painScoresRouter from '../../routes/pain-scores.routes';
import {
  createTestApp,
  createTestUser,
  cleanupTestUser,
  cleanupUserData,
  authenticatedRequest,
  TestUserData,
} from '../helpers';

describe('Pain Score API Routes', () => {
  let app: express.Application;
  let testUserData: TestUserData;

  beforeAll(async () => {
    app = createTestApp([{ path: '/api/pain-scores', router: painScoresRouter }]);
    testUserData = await createTestUser('pain-score-test@example.com', 'Pain Score Test User');
  });

  afterAll(async () => {
    await cleanupUserData(testUserData.user.id);
    await cleanupTestUser(testUserData.user);
  });

  beforeEach(async () => {
    await cleanupUserData(testUserData.user.id, { painScores: true });
  });

  describe('POST /api/pain-scores', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/pain-scores')
        .send({ date: '2024-01-15', score: 5 })
        .expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should create a new pain score', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/pain-scores')
        .send({ date: '2024-01-15', score: 7, notes: 'Felt sore' })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.date).toBe('2024-01-15');
      expect(response.body.score).toBe(7);
      expect(response.body.notes).toBe('Felt sore');
      expect(response.body.userId).toBe(testUserData.user.id);
    });

    it('should reject score outside 0-10 range (too low)', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/pain-scores')
        .send({ date: '2024-01-15', score: -1 })
        .expect(400);
      expect(response.body.error).toBe('Pain score must be between 0 and 10');
    });

    it('should reject score outside 0-10 range (too high)', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/pain-scores')
        .send({ date: '2024-01-15', score: 11 })
        .expect(400);
      expect(response.body.error).toBe('Pain score must be between 0 and 10');
    });

    it('should prevent duplicate pain score for same date', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      await authReq.post('/api/pain-scores').send({ date: '2024-01-15', score: 5 }).expect(200);

      const response = await authReq
        .post('/api/pain-scores')
        .send({ date: '2024-01-15', score: 6 })
        .expect(400);
      expect(response.body.error).toBe('A pain score already exists for this date');
    });
  });

  describe('GET /api/pain-scores/:id', () => {
    it('should require authentication', async () => {
      // Create record directly
      const repo = dataSource.getRepository(PainScore);
      const pain = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        score: 5,
        notes: null,
      });
      await repo.save(pain);

      const response = await request(app).get(`/api/pain-scores/${pain.id}`).expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent id', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/pain-scores/99999').expect(404);
      expect(response.body.error).toBe('Pain score not found');
    });

    it('should fetch existing pain score', async () => {
      const repo = dataSource.getRepository(PainScore);
      const pain = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        score: 4,
        notes: 'Ok',
      });
      await repo.save(pain);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get(`/api/pain-scores/${pain.id}`).expect(200);
      expect(response.body.id).toBe(pain.id);
      expect(response.body.score).toBe(4);
      expect(response.body.notes).toBe('Ok');
    });
  });

  describe('PUT /api/pain-scores/:id', () => {
    it('should require authentication', async () => {
      const repo = dataSource.getRepository(PainScore);
      const pain = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        score: 3,
        notes: null,
      });
      await repo.save(pain);
      const response = await request(app)
        .put(`/api/pain-scores/${pain.id}`)
        .send({ date: '2024-01-15', score: 4 })
        .expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent pain score', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .put('/api/pain-scores/99999')
        .send({ date: '2024-01-15', score: 5 })
        .expect(404);
      expect(response.body.error).toBe('Pain score not found');
    });

    it('should reject invalid score', async () => {
      const repo = dataSource.getRepository(PainScore);
      const pain = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        score: 3,
        notes: null,
      });
      await repo.save(pain);
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .put(`/api/pain-scores/${pain.id}`)
        .send({ date: '2024-01-15', score: 20 })
        .expect(400);
      expect(response.body.error).toBe('Pain score must be between 0 and 10');
    });

    it('should update existing pain score', async () => {
      const repo = dataSource.getRepository(PainScore);
      const pain = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        score: 2,
        notes: 'Low',
      });
      await repo.save(pain);
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .put(`/api/pain-scores/${pain.id}`)
        .send({ date: '2024-01-16', score: 5, notes: 'Higher' })
        .expect(200);
      expect(response.body.date).toBe('2024-01-16');
      expect(response.body.score).toBe(5);
      expect(response.body.notes).toBe('Higher');
    });

    it('should prevent duplicate date on update', async () => {
      const repo = dataSource.getRepository(PainScore);
      const pain1 = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        score: 2,
        notes: null,
      });
      const pain2 = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-16',
        score: 3,
        notes: null,
      });
      await repo.save([pain1, pain2]);
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .put(`/api/pain-scores/${pain2.id}`)
        .send({ date: '2024-01-15', score: 4 })
        .expect(400);
      expect(response.body.error).toBe('A pain score already exists for this date');
    });
  });

  describe('DELETE /api/pain-scores/:id', () => {
    it('should require authentication', async () => {
      const repo = dataSource.getRepository(PainScore);
      const pain = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        score: 3,
        notes: null,
      });
      await repo.save(pain);
      const response = await request(app).delete(`/api/pain-scores/${pain.id}`).expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent pain score', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.delete('/api/pain-scores/99999').expect(404);
      expect(response.body.error).toBe('Pain score not found');
    });

    it('should delete existing pain score', async () => {
      const repo = dataSource.getRepository(PainScore);
      const pain = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        score: 5,
        notes: null,
      });
      await repo.save(pain);
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.delete(`/api/pain-scores/${pain.id}`).expect(200);
      expect(response.body.id).toBe(pain.id);
      const remaining = await repo.findOne({ where: { id: pain.id } });
      expect(remaining).toBeNull();
    });
  });
});
