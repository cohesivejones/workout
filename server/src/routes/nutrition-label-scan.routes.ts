import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { authenticateToken } from '../middleware/auth';
import { parseNutritionLabel } from '../utils/nutritionLabelParser';
import logger from '../logger';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

async function preprocessForOcr(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize({ width: 2000, withoutEnlargement: false })
    .grayscale()
    .normalize()
    .toBuffer();
}

router.post(
  '/scan',
  authenticateToken,
  upload.single('image'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    try {
      const processed = await preprocessForOcr(req.file.buffer);
      const { createWorker, PSM } = await import('tesseract.js');
      const worker = await createWorker('eng');
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
      const {
        data: { text },
      } = await worker.recognize(processed);
      await worker.terminate();

      const parsed = parseNutritionLabel(text);
      logger.info('Nutrition label scanned', { userId: req.user!.id });
      res.json(parsed);
    } catch (err) {
      logger.error('Nutrition label scan failed', { error: err, userId: req.user!.id });
      res
        .status(500)
        .json({ error: 'Failed to scan nutrition label. Try again with a clearer photo.' });
    }
  }
);

export default router;
