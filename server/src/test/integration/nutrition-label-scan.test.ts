import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
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

// Mock OpenAI before importing the router (sharp runs for real on the image).
const mockCreate = vi.fn();
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

const nutritionLabelScanRouter = await import('../../routes/nutrition-label-scan.routes');

const asset = (name: string) => path.resolve(__dirname, '../assets', name);

// Build the OpenAI-shaped response the route expects.
const aiResponse = (content: string | null) => ({
  choices: [{ message: { content } }],
});

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

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('extracts per-serving nutrition returned by the vision model', async () => {
    mockCreate.mockResolvedValue(
      aiResponse(JSON.stringify({ calories: 484, protein: 42, carbs: 50.2, fat: 10.7 }))
    );

    const res = await authenticatedRequest(app, testUserData.authToken)
      .post('/api/nutrition-label/scan')
      .attach('image', asset('ocr-test-image.jpg'))
      .expect(200);

    expect(res.body).toEqual({ calories: 484, protein: 42, carbs: 50.2, fat: 10.7 });

    // Sends the image to a vision model as JSON.
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([expect.objectContaining({ type: 'image_url' })]),
          }),
        ]),
      })
    );
  });

  it('passes through nulls for fields the model could not read', async () => {
    mockCreate.mockResolvedValue(
      aiResponse(JSON.stringify({ calories: null, protein: null, carbs: null, fat: null }))
    );

    const res = await authenticatedRequest(app, testUserData.authToken)
      .post('/api/nutrition-label/scan')
      .attach('image', asset('ocr-test-image-blank.jpg'))
      .expect(200);

    expect(res.body).toEqual({ calories: null, protein: null, fat: null, carbs: null });
  });

  it('coerces numeric strings and rounds calories', async () => {
    mockCreate.mockResolvedValue(
      aiResponse(JSON.stringify({ calories: '483.6', protein: '42', carbs: 50.2, fat: 10.7 }))
    );

    const res = await authenticatedRequest(app, testUserData.authToken)
      .post('/api/nutrition-label/scan')
      .attach('image', asset('ocr-test-image.jpg'))
      .expect(200);

    expect(res.body).toEqual({ calories: 484, protein: 42, carbs: 50.2, fat: 10.7 });
  });

  it('nulls out non-numeric values without failing', async () => {
    mockCreate.mockResolvedValue(
      aiResponse(JSON.stringify({ calories: 'n/a', protein: 42, carbs: 50.2, fat: 10.7 }))
    );

    const res = await authenticatedRequest(app, testUserData.authToken)
      .post('/api/nutrition-label/scan')
      .attach('image', asset('ocr-test-image.jpg'))
      .expect(200);

    expect(res.body).toEqual({ calories: null, protein: 42, carbs: 50.2, fat: 10.7 });
  });

  it('returns 500 when the image cannot be processed', async () => {
    const res = await authenticatedRequest(app, testUserData.authToken)
      .post('/api/nutrition-label/scan')
      .attach('image', asset('ocr-test-image-corrupt.jpg'))
      .expect(500);

    expect(res.body.error).toBe('Failed to scan nutrition label. Try again with a clearer photo.');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 500 when the AI call fails', async () => {
    mockCreate.mockRejectedValue(new Error('OpenAI API error'));

    const res = await authenticatedRequest(app, testUserData.authToken)
      .post('/api/nutrition-label/scan')
      .attach('image', asset('ocr-test-image.jpg'))
      .expect(500);

    expect(res.body.error).toBe('Failed to scan nutrition label. Try again with a clearer photo.');
  });

  it('returns 500 on an empty AI response', async () => {
    mockCreate.mockResolvedValue(aiResponse(null));

    const res = await authenticatedRequest(app, testUserData.authToken)
      .post('/api/nutrition-label/scan')
      .attach('image', asset('ocr-test-image.jpg'))
      .expect(500);

    expect(res.body.error).toBe('Failed to scan nutrition label. Try again with a clearer photo.');
  });

  it('returns 500 on invalid JSON from the model', async () => {
    mockCreate.mockResolvedValue(aiResponse('this is not json'));

    const res = await authenticatedRequest(app, testUserData.authToken)
      .post('/api/nutrition-label/scan')
      .attach('image', asset('ocr-test-image.jpg'))
      .expect(500);

    expect(res.body.error).toBe('Failed to scan nutrition label. Try again with a clearer photo.');
  });
});
