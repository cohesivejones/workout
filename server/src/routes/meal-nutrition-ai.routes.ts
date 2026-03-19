import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import logger from '../logger';
import OpenAI from 'openai';

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface NutritionRequest {
  description: string;
}

interface NutritionResponse {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

router.post('/analyze', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { description } = req.body as NutritionRequest;

    if (!description || description.trim().length === 0) {
      return res.status(400).json({ error: 'Meal description is required' });
    }

    logger.info('Analyzing meal nutrition with AI', {
      description,
      userId: req.user?.id,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a nutrition expert. Analyze the meal description and provide estimated nutritional information in JSON format. 
Be realistic and accurate based on typical serving sizes. 
Return ONLY valid JSON with these exact fields: {"calories": number, "protein": number, "carbs": number, "fat": number}.
All values should be numbers (no strings, no units).
Calories should be a whole number, macros in grams with up to 1 decimal place.`,
        },
        {
          role: 'user',
          content: `Estimate the nutritional information for this meal: "${description}"`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const nutritionData = JSON.parse(content) as NutritionResponse;

    // Validate the response has all required fields
    if (
      typeof nutritionData.calories !== 'number' ||
      typeof nutritionData.protein !== 'number' ||
      typeof nutritionData.carbs !== 'number' ||
      typeof nutritionData.fat !== 'number'
    ) {
      throw new Error('Invalid nutrition data format from AI');
    }

    logger.info('Meal nutrition analyzed successfully', {
      description,
      nutrition: nutritionData,
      userId: req.user?.id,
    });

    res.json(nutritionData);
  } catch (err) {
    logger.error('Failed to analyze meal nutrition', {
      error: err,
      userId: req.user?.id,
    });
    res.status(500).json({
      error: 'Failed to analyze meal nutrition. Please try again.',
    });
  }
});

export default router;
