import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import dataSource from '../../data-source';
import { WeightEntry } from '../../entities';
import weightEntriesRouter from '../../routes/weight-entries.routes';
import {
  createTestApp,
  createTestUser,
  cleanupTestUser,
  cleanupUserData,
  authenticatedRequest,
  TestUserData,
} from '../helpers';

describe('Weight Entry API Routes', () => {
  let app: express.Application;
  let testUserData: TestUserData;

  beforeAll(async () => {
    app = createTestApp([{ path: '/api/weight-entries', router: weightEntriesRouter }]);
    testUserData = await createTestUser('weight-test@example.com', 'Weight Test User');
  });

  afterAll(async () => {
    await cleanupUserData(testUserData.user.id);
    await cleanupTestUser(testUserData.user);
  });

  beforeEach(async () => {
    await cleanupUserData(testUserData.user.id, { weightEntries: true });
  });

  describe('POST /api/weight-entries', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/weight-entries')
        .send({ date: '2024-01-15', weight: 85.5 })
        .expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should create a new weight entry', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/weight-entries')
        .send({ date: '2024-01-15', weight: 85.5 })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.date).toBe('2024-01-15');
      expect(response.body.weight).toBe(85.5);
      expect(typeof response.body.weight).toBe('number');
      expect(response.body.userId).toBe(testUserData.user.id);
    });

    it('should reject negative weight', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/weight-entries')
        .send({ date: '2024-01-15', weight: -10 })
        .expect(400);
      expect(response.body.error).toContain('Weight must be a positive number');
    });

    it('should reject zero weight', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .post('/api/weight-entries')
        .send({ date: '2024-01-15', weight: 0 })
        .expect(400);
      expect(response.body.error).toContain('Weight must be a positive number');
    });

    it('should prevent duplicate weight entry for same date', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      await authReq
        .post('/api/weight-entries')
        .send({ date: '2024-01-15', weight: 85.5 })
        .expect(200);

      const response = await authReq
        .post('/api/weight-entries')
        .send({ date: '2024-01-15', weight: 86.0 })
        .expect(400);
      expect(response.body.error).toBe('A weight entry already exists for this date');
    });
  });

  describe('GET /api/weight-entries/by-date', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/weight-entries/by-date?date=2024-01-15')
        .expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when date parameter is missing', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/weight-entries/by-date').expect(400);
      expect(response.body.error).toBe('Date parameter is required');
    });

    it('should return 404 when no weight entry exists for date', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/weight-entries/by-date?date=2024-01-15').expect(404);
      expect(response.body.error).toBe('Weight entry not found for this date');
    });

    it('should fetch weight entry by date', async () => {
      const repo = dataSource.getRepository(WeightEntry);
      const weightEntry = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        weight: 85.5,
      });
      await repo.save(weightEntry);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/weight-entries/by-date?date=2024-01-15').expect(200);
      expect(response.body.date).toBe('2024-01-15');
      expect(response.body.weight).toBe(85.5);
      expect(typeof response.body.weight).toBe('number');
    });

    it('should only return weight entry for authenticated user', async () => {
      const repo = dataSource.getRepository(WeightEntry);

      // Create weight entry for test user
      await repo.save(
        repo.create({
          userId: testUserData.user.id,
          date: '2024-01-15',
          weight: 85.5,
        })
      );

      // Create weight entry for different user
      const otherUser = await createTestUser('other-weight-test@example.com', 'Other User');
      await repo.save(
        repo.create({
          userId: otherUser.user.id,
          date: '2024-01-15',
          weight: 90.0,
        })
      );

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/weight-entries/by-date?date=2024-01-15').expect(200);

      expect(response.body.weight).toBe(85.5);
      expect(typeof response.body.weight).toBe('number');
      expect(response.body.userId).toBe(testUserData.user.id);

      // Cleanup other user
      await cleanupUserData(otherUser.user.id);
      await cleanupTestUser(otherUser.user);
    });
  });

  describe('GET /api/weight-entries/latest', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/weight-entries/latest').expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 when no weight entries exist', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/weight-entries/latest').expect(404);
      expect(response.body.error).toBe('No weight entries found');
    });

    it('should fetch latest weight entry', async () => {
      const repo = dataSource.getRepository(WeightEntry);

      // Create older entry
      await repo.save(
        repo.create({
          userId: testUserData.user.id,
          date: '2024-01-10',
          weight: 87.0,
        })
      );

      // Create newer entry
      await repo.save(
        repo.create({
          userId: testUserData.user.id,
          date: '2024-01-15',
          weight: 85.5,
        })
      );

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/weight-entries/latest').expect(200);

      expect(response.body.date).toBe('2024-01-15');
      expect(response.body.weight).toBe(85.5);
      expect(typeof response.body.weight).toBe('number');
    });

    it('should only return latest weight entry for authenticated user', async () => {
      const repo = dataSource.getRepository(WeightEntry);

      // Create entry for test user
      await repo.save(
        repo.create({
          userId: testUserData.user.id,
          date: '2024-01-15',
          weight: 85.5,
        })
      );

      // Create entry for different user
      const otherUser = await createTestUser('other-weight-test@example.com', 'Other User');
      await repo.save(
        repo.create({
          userId: otherUser.user.id,
          date: '2024-01-20',
          weight: 90.0,
        })
      );

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.get('/api/weight-entries/latest').expect(200);

      expect(response.body.weight).toBe(85.5);
      expect(typeof response.body.weight).toBe('number');
      expect(response.body.userId).toBe(testUserData.user.id);

      // Cleanup other user
      await cleanupUserData(otherUser.user.id);
      await cleanupTestUser(otherUser.user);
    });
  });

  describe('PUT /api/weight-entries/:id', () => {
    it('should require authentication', async () => {
      const repo = dataSource.getRepository(WeightEntry);
      const weightEntry = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        weight: 85.5,
      });
      await repo.save(weightEntry);

      const response = await request(app)
        .put(`/api/weight-entries/${weightEntry.id}`)
        .send({ date: '2024-01-15', weight: 86.0 })
        .expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent weight entry', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .put('/api/weight-entries/99999')
        .send({ date: '2024-01-15', weight: 86.0 })
        .expect(404);
      expect(response.body.error).toBe('Weight entry not found');
    });

    it('should reject negative weight', async () => {
      const repo = dataSource.getRepository(WeightEntry);
      const weightEntry = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        weight: 85.5,
      });
      await repo.save(weightEntry);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .put(`/api/weight-entries/${weightEntry.id}`)
        .send({ date: '2024-01-15', weight: -10 })
        .expect(400);
      expect(response.body.error).toContain('Weight must be a positive number');
    });

    it('should update existing weight entry', async () => {
      const repo = dataSource.getRepository(WeightEntry);
      const weightEntry = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        weight: 85.5,
      });
      await repo.save(weightEntry);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .put(`/api/weight-entries/${weightEntry.id}`)
        .send({ date: '2024-01-16', weight: 86.0 })
        .expect(200);

      expect(response.body.date).toBe('2024-01-16');
      expect(response.body.weight).toBe(86.0);
      expect(typeof response.body.weight).toBe('number');
    });

    it('should prevent duplicate date on update', async () => {
      const repo = dataSource.getRepository(WeightEntry);
      const entry1 = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        weight: 85.5,
      });
      const entry2 = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-16',
        weight: 86.0,
      });
      await repo.save([entry1, entry2]);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq
        .put(`/api/weight-entries/${entry2.id}`)
        .send({ date: '2024-01-15', weight: 87.0 })
        .expect(400);
      expect(response.body.error).toBe('A weight entry already exists for this date');
    });
  });

  describe('DELETE /api/weight-entries/:id', () => {
    it('should require authentication', async () => {
      const repo = dataSource.getRepository(WeightEntry);
      const weightEntry = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        weight: 85.5,
      });
      await repo.save(weightEntry);

      const response = await request(app)
        .delete(`/api/weight-entries/${weightEntry.id}`)
        .expect(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent weight entry', async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.delete('/api/weight-entries/99999').expect(404);
      expect(response.body.error).toBe('Weight entry not found');
    });

    it('should delete existing weight entry', async () => {
      const repo = dataSource.getRepository(WeightEntry);
      const weightEntry = repo.create({
        userId: testUserData.user.id,
        date: '2024-01-15',
        weight: 85.5,
      });
      await repo.save(weightEntry);

      const authReq = authenticatedRequest(app, testUserData.authToken);
      const response = await authReq.delete(`/api/weight-entries/${weightEntry.id}`).expect(200);
      expect(response.body.id).toBe(weightEntry.id);

      const remaining = await repo.findOne({ where: { id: weightEntry.id } });
      expect(remaining).toBeNull();
    });
  });
});
