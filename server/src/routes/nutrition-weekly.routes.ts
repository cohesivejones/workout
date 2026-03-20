import { Router, Request, Response } from 'express';
import { Between } from 'typeorm';
import dataSource from '../data-source';
import { Meal, WeightEntry } from '../entities';
import { authenticateToken } from '../middleware/auth';
import logger from '../logger';
import { startOfWeek, addDays, format, isValid, getDay } from 'date-fns';

const router = Router();

interface DailyData {
  date: string;
  weight: number | null;
  totalCalories: number | null;
  totalProtein: number | null;
  totalCarbs: number | null;
  totalFat: number | null;
}

interface WeeklySummaryResponse {
  weekStart: string;
  weekEnd: string;
  dailyData: DailyData[];
}

router.get('/weekly-summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    let weekStart: Date;

    // If startDate is provided, validate and use it; otherwise use current week
    if (req.query.startDate) {
      const startDateStr = req.query.startDate as string;
      const parsedDate = new Date(startDateStr);

      if (!isValid(parsedDate)) {
        return res.status(400).json({ error: 'Invalid date format' });
      }

      // Check if it's a Monday (getDay() returns 1 for Monday)
      if (getDay(parsedDate) !== 1) {
        return res.status(400).json({ error: 'Start date must be a Monday' });
      }

      weekStart = parsedDate;
    } else {
      // Get current week's Monday
      weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    }

    const weekEnd = addDays(weekStart, 6); // Sunday
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    // Fetch all meals for the week
    const meals = await dataSource.getRepository(Meal).find({
      where: {
        userId: Number(userId),
        date: Between(weekStartStr, weekEndStr),
      },
      order: { date: 'ASC' },
    });

    // Fetch all weight entries for the week
    const weightEntries = await dataSource.getRepository(WeightEntry).find({
      where: {
        userId: Number(userId),
        date: Between(weekStartStr, weekEndStr),
      },
      order: { date: 'ASC' },
    });

    // Create a map of meals grouped by date
    const mealsByDate = meals.reduce(
      (acc, meal) => {
        if (!acc[meal.date]) {
          acc[meal.date] = [];
        }
        acc[meal.date].push(meal);
        return acc;
      },
      {} as Record<string, typeof meals>
    );

    // Create a map of weight entries by date
    const weightsByDate = weightEntries.reduce(
      (acc, entry) => {
        acc[entry.date] = Number(entry.weight);
        return acc;
      },
      {} as Record<string, number>
    );

    // Generate daily data for all 7 days
    const dailyData: DailyData[] = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(weekStart, i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      // Aggregate meals for this date
      const dayMeals = mealsByDate[dateStr] || [];
      const hasMeals = dayMeals.length > 0;

      const totalCalories = hasMeals
        ? dayMeals.reduce((sum, meal) => sum + Number(meal.calories), 0)
        : null;
      const totalProtein = hasMeals
        ? dayMeals.reduce((sum, meal) => sum + Number(meal.protein), 0)
        : null;
      const totalCarbs = hasMeals
        ? dayMeals.reduce((sum, meal) => sum + Number(meal.carbs), 0)
        : null;
      const totalFat = hasMeals ? dayMeals.reduce((sum, meal) => sum + Number(meal.fat), 0) : null;

      dailyData.push({
        date: dateStr,
        weight: weightsByDate[dateStr] ?? null,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
      });
    }

    const response: WeeklySummaryResponse = {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      dailyData,
    };

    res.json(response);
  } catch (err) {
    logger.error('Get weekly nutrition summary error', {
      error: err,
      userId: req.user?.id,
      startDate: req.query.startDate,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
