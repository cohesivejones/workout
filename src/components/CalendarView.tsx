import React, { useEffect, useReducer } from 'react';
import styles from './CalendarView.module.css';
import classNames from 'classnames';
import { Workout, PainScore, SleepScore } from '../types';
import { calendarReducer, createInitialCalendarState } from './calendarView.reducer';
import { Link, useLocation } from 'wouter';
import { toWorkoutPath, toPainScoreEditPath, toSleepScoreEditPath } from '../utils/paths';
import { GenericCalendarView, CalendarItem } from './GenericCalendarView';
import { fetchTimeline } from '../api';
import { formatWeightWithKg } from '../utils/weight';
import { MdFitnessCenter } from 'react-icons/md';
import { ScoreChip } from './ui/ScoreChip';
import { useUserContext } from '../contexts/useUserContext';
import { format } from 'date-fns';

// Type for workout calendar items
export type WorkoutCalendarItem = Workout & {
  type: 'workout';
};

// Type for pain score calendar items
export type PainScoreCalendarItem = PainScore & {
  type: 'painScore';
};

// Type for sleep score calendar items
export type SleepScoreCalendarItem = SleepScore & {
  type: 'sleepScore';
};

// Union type for all calendar items in this application
export type AppCalendarItem = WorkoutCalendarItem | PainScoreCalendarItem | SleepScoreCalendarItem;

const CalendarView = () => {
  const [, setLocation] = useLocation();
  const { user } = useUserContext();

  const [state, dispatch] = useReducer(calendarReducer, undefined, () =>
    createInitialCalendarState()
  );
  const { workouts, painScores, sleepScores, loading, error, currentMonth, fetchedMonths } = state;

  // Helper to get month key for tracking
  const getMonthKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // Helper to fetch data for a specific month
  const fetchMonthData = async (targetMonth: Date) => {
    if (!user) return;

    const monthKey = getMonthKey(targetMonth);

    // Skip if we've already fetched this month
    if (fetchedMonths.has(monthKey)) {
      return;
    }

    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of month

    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    try {
      const timelineData = await fetchTimeline(startDateStr, endDateStr);

      // Append new data to existing data (accumulate across months)
      dispatch({
        type: 'APPEND_MONTH_DATA',
        payload: {
          monthKey,
          workouts: timelineData.workouts,
          painScores: timelineData.painScores,
          sleepScores: timelineData.sleepScores,
        },
      });
      dispatch({ type: 'MARK_MONTH_FETCHED', payload: monthKey });
    } catch (err) {
      console.error('Failed to load data for month:', monthKey, err);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load data. Please try again later.' });
    }
  };

  // Calculate start and end dates for the current month
  // Calculate start and end dates for the current month
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // Last day of month

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  // Fetch data when user or current month changes
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      await fetchMonthData(currentMonth);
      dispatch({ type: 'SET_LOADING', payload: false });
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, startDateStr, endDateStr]);

  // Handle week changes in mobile view - fetch new month data if needed
  const handleWeekChange = async (newWeek: Date) => {
    if (!user) return;

    const weekMonth = new Date(newWeek.getFullYear(), newWeek.getMonth(), 1);

    // Check if this week is in a different month than currentMonth
    if (
      weekMonth.getMonth() !== currentMonth.getMonth() ||
      weekMonth.getFullYear() !== currentMonth.getFullYear()
    ) {
      // Fetch the new month's data if we haven't already
      await fetchMonthData(weekMonth);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  // Convert workouts, pain scores, and sleep scores to calendar items
  const workoutItems: WorkoutCalendarItem[] = workouts.map((workout) => ({
    ...workout,
    type: 'workout',
  }));

  const painScoreItems: PainScoreCalendarItem[] = painScores.map((painScore) => ({
    ...painScore,
    type: 'painScore',
  }));

  const sleepScoreItems: SleepScoreCalendarItem[] = sleepScores.map((sleepScore) => ({
    ...sleepScore,
    type: 'sleepScore',
  }));

  const allItems: AppCalendarItem[] = [...workoutItems, ...painScoreItems, ...sleepScoreItems];

  // Group items by date
  const getItemsByDate = (items: AppCalendarItem[]) => {
    return items.reduce(
      (acc, item) => {
        const dateStr = item.date.split('T')[0]; // Handle ISO date format
        if (!acc[dateStr]) {
          acc[dateStr] = [];
        }
        acc[dateStr].push(item);
        return acc;
      },
      {} as Record<string, AppCalendarItem[]>
    );
  };

  // Render a grid item (for month view)
  const renderGridItem = (item: AppCalendarItem, dateStr: string) => {
    if (item.type === 'painScore') {
      const painScore = item as PainScoreCalendarItem;
      return (
        <ScoreChip
          key={`pain-${painScore.id}`}
          kind="pain"
          score={painScore.score}
          layout="compact"
          onClick={() => setLocation(toPainScoreEditPath(painScore))}
          ariaLabel={`Edit pain score ${painScore.score} for ${dateStr}`}
        />
      );
    } else if (item.type === 'sleepScore') {
      const sleepScore = item as SleepScoreCalendarItem;
      return (
        <ScoreChip
          key={`sleep-${sleepScore.id}`}
          kind="sleep"
          score={sleepScore.score}
          layout="compact"
          onClick={() => setLocation(toSleepScoreEditPath(sleepScore))}
          ariaLabel={`Edit sleep score ${sleepScore.score} for ${dateStr}`}
        />
      );
    } else {
      const workout = item as WorkoutCalendarItem;
      return (
        <Link
          to={toWorkoutPath(workout)}
          key={`workout-${workout.id}`}
          className={classNames(styles.calendarWorkout, {
            [styles.withInstructor]: workout.withInstructor,
          })}
          onClick={(e) => e.stopPropagation()}
          data-testid={`calendar-workout-${workout.id}`}
        >
          <MdFitnessCenter className={styles.workoutIcon} aria-hidden="true" />
          <div className={styles.workoutExercises}>
            {workout.exercises.map((exercise, idx) => (
              <div key={idx} className={styles.workoutExercise}>
                {exercise.name}
              </div>
            ))}
          </div>
        </Link>
      );
    }
  };

  // Render a vertical item (for week view)
  const renderVerticalItem = (item: AppCalendarItem, dateStr: string) => {
    if (item.type === 'painScore') {
      const painScore = item as PainScoreCalendarItem;
      return (
        <ScoreChip
          key={`pain-${painScore.id}`}
          kind="pain"
          score={painScore.score}
          layout="full"
          onClick={() => setLocation(toPainScoreEditPath(painScore))}
          ariaLabel={`Edit pain score ${painScore.score} for ${dateStr}`}
        />
      );
    } else if (item.type === 'sleepScore') {
      const sleepScore = item as SleepScoreCalendarItem;
      return (
        <ScoreChip
          key={`sleep-${sleepScore.id}`}
          kind="sleep"
          score={sleepScore.score}
          layout="full"
          onClick={() => setLocation(toSleepScoreEditPath(sleepScore))}
          ariaLabel={`Edit sleep score ${sleepScore.score} for ${dateStr}`}
        />
      );
    } else {
      const workout = item as WorkoutCalendarItem;
      return (
        <Link
          to={toWorkoutPath(workout)}
          key={`workout-${workout.id}`}
          className={classNames(styles.verticalWorkout, {
            [styles.withInstructor]: workout.withInstructor,
          })}
          data-testid={`calendar-workout-${workout.id}`}
        >
          <div className={styles.verticalWorkoutExercises}>
            {workout.exercises.map((exercise, idx) => (
              <div key={idx} className={styles.verticalWorkoutExercise}>
                <span className={styles.exerciseName}>{exercise.name}</span>
                <span className={styles.exerciseDetails}>
                  {exercise.reps} reps
                  {exercise.weight ? ` - ${formatWeightWithKg(exercise.weight)}` : ''}
                </span>
              </div>
            ))}
          </div>
        </Link>
      );
    }
  };

  return (
    <GenericCalendarView
      items={allItems}
      renderGridItem={renderGridItem}
      renderVerticalItem={renderVerticalItem}
      getItemsByDate={getItemsByDate}
      emptyStateMessage="No data"
      currentMonth={currentMonth}
      onMonthChange={(m) => dispatch({ type: 'SET_MONTH', payload: m })}
      onWeekChange={handleWeekChange}
    />
  );
};

export default CalendarView;
export type { CalendarItem };
