import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'path';
import {
  createTestApp,
  createTestUser,
  cleanupTestUser,
  authenticatedRequest,
  TestUserData,
} from '../helpers';

const nutritionLabelScanRouter = await import('../../routes/nutrition-label-scan.routes');

const asset = (name: string) => path.resolve(__dirname, '../assets', name);

describe('Nutrition Label Scan API', () => {
  let app: express.Application;
  let testUserData: TestUserData;

  beforeAll(async () => {
    app = createTestApp([
      { path: '/api/nutrition-label', router: nutritionLabelScanRouter.default },
    ]);
    testUserData = await createTestUser('scan-test@example.com', 'Scan Test User');
  });

  afterAll(async () => {
    await cleanupTestUser(testUserData.user);
  });

  it('requires authentication', async () => {
    await request(app)
      .post('/api/nutrition-label/scan')
      .attach('image', Buffer.from('x'), 'label.jpg')
      .expect(401);
  });

  it('returns 400 when no image is uploaded', async () => {
    const res = await authenticatedRequest(app, testUserData.authToken)
      .post('/api/nutrition-label/scan')
      .expect(400);

    expect(res.body.error).toBe('Image file is required');
  });

  it('returns 500 when the image cannot be processed', async () => {
    const res = await authenticatedRequest(app, testUserData.authToken)
      .post('/api/nutrition-label/scan')
      .attach('image', asset('ocr-test-image-corrupt.jpg'))
      .expect(500);

    expect(res.body.error).toBe('Failed to scan nutrition label. Try again with a clearer photo.');
  });

  it(
    'returns nulls for fields that cannot be read from the label',
    { timeout: 30000 },
    async () => {
      const res = await authenticatedRequest(app, testUserData.authToken)
        .post('/api/nutrition-label/scan')
        .attach('image', asset('ocr-test-image-blank.jpg'))
        .expect(200);

      expect(res.body).toEqual({ calories: null, protein: null, fat: null, carbs: null });
    }
  );

  it('extracts correct per-serve nutrition from a label with Cal', { timeout: 30000 }, async () => {
    const res = await authenticatedRequest(app, testUserData.authToken)
      .post('/api/nutrition-label/scan')
      .attach('image', asset('ocr-test-image.jpg'))
      .expect(200);

    expect(res.body).toEqual({ calories: 484, protein: 42, fat: 10.7, carbs: 50.2 });
  });

  it('converts kJ to kcal when Cal is not shown on the label', { timeout: 30000 }, async () => {
    const res = await authenticatedRequest(app, testUserData.authToken)
      .post('/api/nutrition-label/scan')
      .attach('image', asset('ocr-test-image-without-cals.jpg'))
      .expect(200);

    expect(res.body).toEqual({ calories: 323, protein: 0.8, fat: 4.7, carbs: 65.8 });
  });
});
