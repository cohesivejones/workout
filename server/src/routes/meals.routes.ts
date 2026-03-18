import { Router, Request, Response } from 'express';
import dataSource from '../data-source';
import { Meal } from '../entities';
import { authenticateToken } from '../middleware/auth';
import { DatabaseError } from '../types';
import logger from '../logger';

const router = Router();

interface CreateMealRequest {
  date: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Get meals by date query param
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string;
    const userId = req.user!.id;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const repo = dataSource.getRepository(Meal);
    const meals = await repo.find({
      where: { userId, date },
      order: { id: 'ASC' },
    });

    res.json(meals);
  } catch (err) {
    logger.error('Get meals by date error', {
      error: err,
      date: req.query.date,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const repo = dataSource.getRepository(Meal);
    const meal = await repo.findOne({ where: { id } });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });
    res.json(meal);
  } catch (err) {
    logger.error('Get meal error', {
      error: err,
      mealId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { date, description, calories, protein, carbs, fat } = req.body as CreateMealRequest;
    const userId = req.user!.id;

    // Validate positive values
    if (calories < 0 || protein < 0 || carbs < 0 || fat < 0) {
      return res.status(400).json({ error: 'All nutrition values must be positive' });
    }

    const repo = dataSource.getRepository(Meal);
    const meal = repo.create({ userId, date, description, calories, protein, carbs, fat });
    await repo.save(meal);

    logger.info('Meal created', {
      mealId: meal.id,
      date: meal.date,
      description: meal.description,
      userId: req.user?.id,
    });
    res.json(meal);
  } catch (err) {
    const error = err as DatabaseError;
    logger.error('Create meal error', { error: err, userId: req.user?.id });
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { date, description, calories, protein, carbs, fat } = req.body as Omit<
      CreateMealRequest,
      'userId'
    >;

    // Validate positive values
    if (calories < 0 || protein < 0 || carbs < 0 || fat < 0) {
      return res.status(400).json({ error: 'All nutrition values must be positive' });
    }

    const repo = dataSource.getRepository(Meal);
    const meal = await repo.findOne({ where: { id } });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });

    meal.date = date;
    meal.description = description;
    meal.calories = calories;
    meal.protein = protein;
    meal.carbs = carbs;
    meal.fat = fat;

    await repo.save(meal);

    logger.info('Meal updated', {
      mealId: meal.id,
      date: meal.date,
      description: meal.description,
      userId: req.user?.id,
    });
    res.json(meal);
  } catch (err) {
    const error = err as DatabaseError;
    logger.error('Update meal error', {
      error: err,
      mealId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const repo = dataSource.getRepository(Meal);
    const meal = await repo.findOne({ where: { id } });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });
    await repo.remove(meal);
    logger.info('Meal deleted', { mealId: id, userId: req.user?.id });
    res.json({ id });
  } catch (err) {
    logger.error('Delete meal error', {
      error: err,
      mealId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
