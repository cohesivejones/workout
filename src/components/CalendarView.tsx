import React from "react";
import styles from "./CalendarView.module.css";
import classNames from "classnames";
import { Workout, PainScore } from "../types";
import { Link, useNavigate } from "react-router-dom";
import { toWorkoutPath, toPainScoreEditPath } from "../utils/paths";
import { GenericCalendarView, CalendarItem } from "./GenericCalendarView";

// Type for workout calendar items
export type WorkoutCalendarItem = Workout & {
  type: "workout";
};

// Type for pain score calendar items
export type PainScoreCalendarItem = PainScore & {
  type: "painScore";
};

// Union type for all calendar items in this application
export type AppCalendarItem = WorkoutCalendarItem | PainScoreCalendarItem;

// Function to get color based on pain score
const getPainScoreColor = (score: number): string => {
  if (score === 0) return "#4caf50"; // Green for no pain
  if (score <= 3) return "#8bc34a"; // Light green for mild pain
  if (score <= 5) return "#ffc107"; // Yellow for moderate pain
  if (score <= 7) return "#ff9800"; // Orange for severe pain
  return "#f44336"; // Red for extreme pain
};

// Specific implementation for workouts and pain scores
interface WorkoutCalendarProps {
  workouts: Workout[];
  painScores: PainScore[];
}

const CalendarView: React.FC<WorkoutCalendarProps> = ({
  workouts,
  painScores,
}) => {
  const navigate = useNavigate();

  // Convert workouts and pain scores to calendar items
  const workoutItems: WorkoutCalendarItem[] = workouts.map((workout) => ({
    ...workout,
    type: "workout",
  }));

  const painScoreItems: PainScoreCalendarItem[] = painScores.map(
    (painScore) => ({
      ...painScore,
      type: "painScore",
    })
  );

  const allItems: AppCalendarItem[] = [...workoutItems, ...painScoreItems];

  // Group items by date
  const getItemsByDate = (items: AppCalendarItem[]) => {
    return items.reduce((acc, item) => {
      const dateStr = item.date.split("T")[0]; // Handle ISO date format
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(item);
      return acc;
    }, {} as Record<string, AppCalendarItem[]>);
  };

  // Render a grid item (for month view)
  const renderGridItem = (item: AppCalendarItem, dateStr: string) => {
    if (item.type === "painScore") {
      const painScore = item as PainScoreCalendarItem;
      return (
        <button
          key={`pain-${painScore.id}`}
          className={styles.calendarPainScore}
          style={{ backgroundColor: getPainScoreColor(painScore.score) }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(toPainScoreEditPath(painScore));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              navigate(toPainScoreEditPath(painScore));
            }
          }}
          aria-label={`Edit pain score ${painScore.score} for ${dateStr}`}
        >
          Pain: {painScore.score}
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
    if (item.type === "painScore") {
      const painScore = item as PainScoreCalendarItem;
      return (
        <button
          key={`pain-${painScore.id}`}
          className={styles.verticalPainScore}
          style={{ backgroundColor: getPainScoreColor(painScore.score) }}
          onClick={() => navigate(toPainScoreEditPath(painScore))}
          aria-label={`Edit pain score ${painScore.score} for ${dateStr}`}
        >
          Pain: {painScore.score}
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
        >
          <div className={styles.verticalWorkoutExercises}>
            {workout.exercises.map((exercise, idx) => (
              <div key={idx} className={styles.verticalWorkoutExercise}>
                <span className={styles.exerciseName}>{exercise.name}</span>
                <span className={styles.exerciseDetails}>
                  {exercise.reps} reps
                  {exercise.weight ? ` - ${exercise.weight} lbs` : ""}
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
    />
  );
};

export default CalendarView;
export type { CalendarItem };
