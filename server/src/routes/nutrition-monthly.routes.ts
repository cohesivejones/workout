import { Router, Request, Response } from 'express';
import { Between } from 'typeorm';
import dataSource from '../data-source';
import { Meal, WeightEntry, Workout } from '../entities';
import { authenticateToken } from '../middleware/auth';
import logger from '../logger';
import { startOfMonth, endOfMonth, addDays, format, isValid, getDate } from 'date-fns';

const router = Router();

interface DailyData {
  date: string;
  weight: number | null;
  totalCalories: number | null;
  totalProtein: number | null;
  totalCarbs: number | null;
  totalFat: number | null;
  workoutDay: boolean;
}

interface MonthlySummaryResponse {
  monthStart: string;
  monthEnd: string;
  dailyData: DailyData[];
}

router.get('/monthly-summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    let monthStart: Date;
    let monthEnd: Date;

    // If startDate is provided, validate and use it; otherwise use current month
    if (req.query.startDate) {
      const startDateStr = req.query.startDate as string;
      const parsedDate = new Date(startDateStr);

      if (!isValid(parsedDate)) {
        return res.status(400).json({ error: 'Invalid date format' });
      }

      // Check if it's the first day of the month
      if (getDate(parsedDate) !== 1) {
        return res.status(400).json({ error: 'Start date must be the first day of a month' });
      }

      monthStart = parsedDate;
      monthEnd = endOfMonth(parsedDate);
    } else {
      // Get current month's first and last day
      const now = new Date();
      monthStart = startOfMonth(now);
      monthEnd = endOfMonth(now);
    }

    const monthStartStr = format(monthStart, 'yyyy-MM-dd');
    const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

    // Fetch all meals for the month
    const meals = await dataSource.getRepository(Meal).find({
      where: {
        userId: Number(userId),
        date: Between(monthStartStr, monthEndStr),
      },
      order: { date: 'ASC' },
    });

    // Fetch all weight entries for the month
    const weightEntries = await dataSource.getRepository(WeightEntry).find({
      where: {
        userId: Number(userId),
        date: Between(monthStartStr, monthEndStr),
      },
      order: { date: 'ASC' },
    });

    // Fetch all workouts for the month to determine workout days
    const workouts = await dataSource.getRepository(Workout).find({
      where: {
        userId: Number(userId),
        date: Between(monthStartStr, monthEndStr),
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

    // Create a set of workout dates
    const workoutDates = new Set(workouts.map((workout) => workout.date));

    // Generate daily data for all days in the month
    const dailyData: DailyData[] = [];
    const daysInMonth = monthEnd.getDate();

    for (let i = 0; i < daysInMonth; i++) {
      const currentDate = addDays(monthStart, i);
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
        workoutDay: workoutDates.has(dateStr),
      });
    }

    const response: MonthlySummaryResponse = {
      monthStart: monthStartStr,
      monthEnd: monthEndStr,
      dailyData,
    };

    res.json(response);
  } catch (err) {
    logger.error('Get monthly nutrition summary error', {
      error: err,
      userId: req.user?.id,
      startDate: req.query.startDate,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
