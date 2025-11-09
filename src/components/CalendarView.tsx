import React, { useState, useEffect } from 'react';
import styles from './CalendarView.module.css';
import classNames from 'classnames';
import { Workout, PainScore, SleepScore } from '../types';
import { Link, useLocation } from 'wouter';
import { toWorkoutPath, toPainScoreEditPath, toSleepScoreEditPath } from '../utils/paths';
import { GenericCalendarView, CalendarItem } from './GenericCalendarView';
import { fetchTimeline } from '../api';
import { useUserContext } from '../contexts/useUserContext';

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

// Function to get color based on pain score
const getPainScoreColor = (score: number): string => {
  if (score === 0) return '#4caf50'; // Green for no pain
  if (score <= 3) return '#8bc34a'; // Light green for mild pain
  if (score <= 5) return '#ffc107'; // Yellow for moderate pain
  if (score <= 7) return '#ff9800'; // Orange for severe pain
  return '#f44336'; // Red for extreme pain
};

// Function to get color based on sleep score
const getSleepScoreColor = (score: number): string => {
  switch (score) {
    case 5:
      return '#4caf50'; // Green for excellent sleep
    case 4:
      return '#8bc34a'; // Light green for good sleep
    case 3:
      return '#ffc107'; // Yellow for fair sleep
    case 2:
      return '#ff9800'; // Orange for poor sleep
    case 1:
      return '#f44336'; // Red for very poor sleep
    default:
      return '#ffc107'; // Default to yellow
  }
};

const CalendarView = () => {
  const [, setLocation] = useLocation();
  const { user } = useUserContext();

  // State for data fetching
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [painScores, setPainScores] = useState<PainScore[]>([]);
  const [sleepScores, setSleepScores] = useState<SleepScore[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Track which months we've already fetched to avoid duplicate requests
  const [fetchedMonths, setFetchedMonths] = useState<Set<string>>(new Set());

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

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    try {
      const timelineData = await fetchTimeline(startDateStr, endDateStr);

      // Append new data to existing data (accumulate across months)
      setWorkouts((prev) => [...prev, ...timelineData.workouts]);
      setPainScores((prev) => [...prev, ...timelineData.painScores]);
      setSleepScores((prev) => [...prev, ...timelineData.sleepScores]);

      // Mark this month as fetched
      setFetchedMonths((prev) => new Set(prev).add(monthKey));
    } catch (err) {
      console.error('Failed to load data for month:', monthKey, err);
      setError('Failed to load data. Please try again later.');
    }
  };

  // Calculate start and end dates for the current month
  // Calculate start and end dates for the current month
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // Last day of month

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Fetch data when user or current month changes
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      // Fetch the current month's data
      await fetchMonthData(currentMonth);

      setLoading(false);
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
        <button
          key={`pain-${painScore.id}`}
          className={styles.calendarPainScore}
          style={{ backgroundColor: getPainScoreColor(painScore.score) }}
          onClick={(e) => {
            e.stopPropagation();
            setLocation(toPainScoreEditPath(painScore));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setLocation(toPainScoreEditPath(painScore));
            }
          }}
          aria-label={`Edit pain score ${painScore.score} for ${dateStr}`}
        >
          Pain: {painScore.score}
        </button>
      );
    } else if (item.type === 'sleepScore') {
      const sleepScore = item as SleepScoreCalendarItem;
      return (
        <button
          key={`sleep-${sleepScore.id}`}
          className={styles.calendarSleepScore}
          style={{ backgroundColor: getSleepScoreColor(sleepScore.score) }}
          onClick={(e) => {
            e.stopPropagation();
            setLocation(toSleepScoreEditPath(sleepScore));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setLocation(toSleepScoreEditPath(sleepScore));
            }
          }}
          aria-label={`Edit sleep score ${sleepScore.score} for ${dateStr}`}
        >
          Sleep: {sleepScore.score}
        </button>
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
        <button
          key={`pain-${painScore.id}`}
          className={styles.verticalPainScore}
          style={{ backgroundColor: getPainScoreColor(painScore.score) }}
          onClick={() => setLocation(toPainScoreEditPath(painScore))}
          aria-label={`Edit pain score ${painScore.score} for ${dateStr}`}
        >
          Pain: {painScore.score}
        </button>
      );
    } else if (item.type === 'sleepScore') {
      const sleepScore = item as SleepScoreCalendarItem;
      return (
        <button
          key={`sleep-${sleepScore.id}`}
          className={styles.verticalSleepScore}
          style={{ backgroundColor: getSleepScoreColor(sleepScore.score) }}
          onClick={() => setLocation(toSleepScoreEditPath(sleepScore))}
          aria-label={`Edit sleep score ${sleepScore.score} for ${dateStr}`}
        >
          Sleep: {sleepScore.score}
        </button>
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
                  {exercise.weight ? ` - ${exercise.weight} lbs` : ''}
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
      onMonthChange={setCurrentMonth}
      onWeekChange={handleWeekChange}
    />
  );
};

export default CalendarView;
export type { CalendarItem };
