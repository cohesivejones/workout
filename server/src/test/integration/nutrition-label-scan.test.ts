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

const MOCK_OCR_TEXT = `
LARGER PORTION MEAL
SERVING SIZE: 404 g
Avg. Qty per Serve Avg. Qty per 100 g
Energy 2030 kJ (484 Cal) 501 kJ (120 Cal)
Protein 42 g 10.4 g
Fat, TOTAL 10.7 g 2.6 g
Carbohydrates 50.2 g 12.4 g
Sodium 1670 mg 414 mg
`;

// Label that lists energy in kJ only — no Cal column
const MOCK_OCR_TEXT_KJ_ONLY = `
SERVING SIZE: 350 g
Avg. Qty per Serve Avg. Qty per 100 g
Energy 2092 kJ 598 kJ
Protein 35 g 10 g
Fat, TOTAL 8.5 g 2.4 g
Carbohydrates 62 g 17.7 g
Sodium 980 mg 280 mg
`;

const IMAGE_PATH = path.resolve(__dirname, '../assets/ocr-test-image.jpg');
const IMAGE_PATH_KJ_ONLY = path.resolve(__dirname, '../assets/ocr-test-image-without-cals.jpg');

const EXPECTED = { calories: 484, protein: 42, fat: 10.7, carbs: 50.2 };
// 2092 kJ / 4.184 = 499.76 → 500 kcal
const EXPECTED_KJ_ONLY = { calories: 500, protein: 35, fat: 8.5, carbs: 62 };

// vi.hoisted ensures these are available inside vi.mock factories (which are hoisted above imports)
const { mockRecognize, mockTerminate, mockSetParameters, mockSharp } = vi.hoisted(() => {
  const mockSharp = vi.fn((buf: Buffer) => {
    const chain: Record<string, unknown> = {};
    chain.resize = () => chain;
    chain.grayscale = () => chain;
    chain.normalize = () => chain;
    chain.toBuffer = () => Promise.resolve(buf);
    return chain;
  });
  return {
    mockRecognize: vi.fn(),
    mockTerminate: vi.fn(),
    mockSetParameters: vi.fn().mockResolvedValue(undefined),
    mockSharp,
  };
});

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({
    recognize: mockRecognize,
    setParameters: mockSetParameters,
    terminate: mockTerminate,
  }),
}));

vi.mock('sharp', () => ({ default: mockSharp }));

const nutritionLabelScanRouter = await import('../../routes/nutrition-label-scan.routes');

describe('Nutrition Label Scan API — mocked OCR', () => {
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
    mockSetParameters.mockResolvedValue(undefined);
    mockRecognize.mockResolvedValue({ data: { text: MOCK_OCR_TEXT } });
  });

  it('requires authentication', async () => {
    await request(app)
      .post('/api/nutrition-label/scan')
      .attach('image', Buffer.from('fake'), 'label.jpg')
      .expect(401);
  });

  it('returns 400 when no image is uploaded', async () => {
    const authReq = authenticatedRequest(app, testUserData.authToken);
    const res = await authReq.post('/api/nutrition-label/scan').expect(400);

    expect(res.body.error).toBe('Image file is required');
  });

  it('parses the nutrition label and returns per-serve values', async () => {
    const authReq = authenticatedRequest(app, testUserData.authToken);
    const res = await authReq
      .post('/api/nutrition-label/scan')
      .attach('image', Buffer.from('fake-image-data'), 'label.jpg')
      .expect(200);

    expect(res.body).toEqual(EXPECTED);
  });

  it('returns nulls for fields that cannot be read from the label', async () => {
    mockRecognize.mockResolvedValue({ data: { text: 'random text not a nutrition label' } });

    const authReq = authenticatedRequest(app, testUserData.authToken);
    const res = await authReq
      .post('/api/nutrition-label/scan')
      .attach('image', Buffer.from('fake-image-data'), 'label.jpg')
      .expect(200);

    expect(res.body).toEqual({ calories: null, protein: null, fat: null, carbs: null });
  });

  it('returns 500 when OCR fails', async () => {
    mockRecognize.mockRejectedValue(new Error('OCR engine failed'));

    const authReq = authenticatedRequest(app, testUserData.authToken);
    const res = await authReq
      .post('/api/nutrition-label/scan')
      .attach('image', Buffer.from('fake-image-data'), 'label.jpg')
      .expect(500);

    expect(res.body.error).toBe('Failed to scan nutrition label. Try again with a clearer photo.');
  });

  it('converts kJ to kcal when no Cal column is present', async () => {
    mockRecognize.mockResolvedValue({ data: { text: MOCK_OCR_TEXT_KJ_ONLY } });

    const authReq = authenticatedRequest(app, testUserData.authToken);
    const res = await authReq
      .post('/api/nutrition-label/scan')
      .attach('image', Buffer.from('fake-image-data'), 'label.jpg')
      .expect(200);

    expect(res.body).toEqual(EXPECTED_KJ_ONLY);
  });
});

describe('Nutrition Label Scan — real OCR', () => {
  let app: express.Application;
  let testUserData: TestUserData;

  beforeAll(async () => {
    app = createTestApp([
      { path: '/api/nutrition-label', router: nutritionLabelScanRouter.default },
    ]);
    testUserData = await createTestUser('scan-real-test@example.com', 'Scan Real Test User');

    // Swap both mocks for their real implementations for this describe block
    const { createWorker: realCreateWorker } =
      await vi.importActual<typeof import('tesseract.js')>('tesseract.js');
    const { createWorker: mockedCreateWorker } = await import('tesseract.js');
    (mockedCreateWorker as ReturnType<typeof vi.fn>).mockImplementation(realCreateWorker as never);

    const { default: realSharp } = await vi.importActual<typeof import('sharp')>('sharp');
    mockSharp.mockImplementation(realSharp as never);
  });

  afterAll(async () => {
    await cleanupTestUser(testUserData.user);
  });

  it(
    'extracts correct per-serve nutrition from the real label image',
    { timeout: 30000 },
    async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const res = await authReq
        .post('/api/nutrition-label/scan')
        .attach('image', IMAGE_PATH)
        .expect(200);

      expect(res.body).toEqual(EXPECTED);
    }
  );
});

describe('Nutrition Label Scan — real OCR (kJ-only label)', () => {
  let app: express.Application;
  let testUserData: TestUserData;

  beforeAll(async () => {
    app = createTestApp([
      { path: '/api/nutrition-label', router: nutritionLabelScanRouter.default },
    ]);
    testUserData = await createTestUser('scan-real-kj-test@example.com', 'Scan Real kJ Test User');

    const { createWorker: realCreateWorker } =
      await vi.importActual<typeof import('tesseract.js')>('tesseract.js');
    const { createWorker: mockedCreateWorker } = await import('tesseract.js');
    (mockedCreateWorker as ReturnType<typeof vi.fn>).mockImplementation(realCreateWorker as never);

    const { default: realSharp } = await vi.importActual<typeof import('sharp')>('sharp');
    mockSharp.mockImplementation(realSharp as never);
  });

  afterAll(async () => {
    await cleanupTestUser(testUserData.user);
  });

  it(
    'converts kJ to kcal when Cal is not shown on the real label',
    { timeout: 30000 },
    async () => {
      const authReq = authenticatedRequest(app, testUserData.authToken);
      const res = await authReq
        .post('/api/nutrition-label/scan')
        .attach('image', IMAGE_PATH_KJ_ONLY)
        .expect(200);

      // 1350 kJ / 4.184 = 322.6 → 323 kcal
      expect(res.body).toEqual({ calories: 323, protein: 0.8, fat: 4.7, carbs: 65.8 });
    }
  );
});
