import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import OpenAI from 'openai';
import { authenticateToken } from '../middleware/auth';
import logger from '../logger';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// gpt-4o-mini is multimodal and reads labels far more reliably than the old
// Tesseract + regex parser. Bump to 'gpt-4o' if small-print accuracy needs it.
const MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You read Nutrition Facts labels from a photo and extract the values PER SERVING.
Return ONLY valid JSON with exactly these fields: {"calories": number|null, "protein": number|null, "carbs": number|null, "fat": number|null}.
- calories: energy per serving in kilocalories (Cal / kcal), a whole number. If the label lists only kilojoules (kJ), convert to kcal by dividing by 4.184.
- protein, carbs, fat: grams per serving, numbers with up to one decimal place. For carbs use the "total carbohydrate" figure, not "sugars".
- Report only what is printed for a SINGLE serving. Do NOT estimate, guess, or infer anything that is not on the label.
- If a value is missing or not legible, use null for that field.
- No units, no strings, no additional fields.`;

interface ScannedNutrition {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

// Auto-orient (phones tag rotation in EXIF), downscale, and re-encode as a
// data URL the vision model can read.
async function toImageDataUrl(buffer: Buffer): Promise<string> {
  const jpeg = await sharp(buffer)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

// The model may return a number, a numeric string, or null — normalize.
function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
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
      const imageUrl = await toImageDataUrl(req.file.buffer);

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract the per-serving nutrition from this Nutrition Facts label.',
              },
              { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
            ],
          },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const raw = JSON.parse(content) as Record<string, unknown>;
      const calories = toNumberOrNull(raw.calories);
      const result: ScannedNutrition = {
        calories: calories === null ? null : Math.round(calories),
        protein: toNumberOrNull(raw.protein),
        carbs: toNumberOrNull(raw.carbs),
        fat: toNumberOrNull(raw.fat),
      };

      logger.info('Nutrition label scanned', { userId: req.user!.id, result });
      res.json(result);
    } catch (err) {
      logger.error('Nutrition label scan failed', { error: err, userId: req.user!.id });
      res
        .status(500)
        .json({ error: 'Failed to scan nutrition label. Try again with a clearer photo.' });
    }
  }
);

export default router;
