import React, { useState } from "react";
import styles from "./CalendarView.module.css";
import { Workout, PainScore } from "../types";
import classNames from "classnames";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  format,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { toWorkoutPath, toPainScoreEditPath } from "../utils/paths";

interface CalendarViewProps {
  workouts: Workout[];
  painScores: PainScore[];
}

const CalendarView: React.FC<CalendarViewProps> = ({
  workouts,
  painScores,
}) => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Group workouts and pain scores by date
  const workoutsByDate = workouts.reduce((acc, workout) => {
    const dateStr = workout.date.split("T")[0]; // Handle ISO date format
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(workout);
    return acc;
  }, {} as Record<string, Workout[]>);

  const painScoresByDate = painScores.reduce((acc, painScore) => {
    const dateStr = painScore.date.split("T")[0]; // Handle ISO date format
    acc[dateStr] = painScore;
    return acc;
  }, {} as Record<string, PainScore>);

  // Function to get color based on pain score
  const getPainScoreColor = (score: number): string => {
    if (score === 0) return "#4caf50"; // Green for no pain
    if (score <= 3) return "#8bc34a"; // Light green for mild pain
    if (score <= 5) return "#ffc107"; // Yellow for moderate pain
    if (score <= 7) return "#ff9800"; // Orange for severe pain
    return "#f44336"; // Red for extreme pain
  };

  const renderHeader = () => {
    return (
      <div className={styles.calendarHeader}>
        <button
          className={styles.navButton}
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          &lt;
        </button>
        <h2 className={styles.monthTitle}>{format(currentMonth, "MMMM yyyy")}</h2>
        <button
          className={styles.navButton}
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          &gt;
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return (
      <div className={styles.calendarDays}>
        {days.map((day) => (
          <div className={styles.calendarDayName} key={day}>
        {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const dateStr = format(day, "yyyy-MM-dd");
        const dayWorkouts = workoutsByDate[dateStr] || [];
        const painScore = painScoresByDate[dateStr];

        days.push(
            <div
            className={classNames(styles.calendarCell, {
              [styles.disabled]: !isSameMonth(day, monthStart),
              [styles.today]: isToday(day),
            })}
            >
            <div className={styles.calendarDate}>{formattedDate}</div>

            {painScore && (
                <button
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
            )}

            <div className={styles.calendarWorkouts}>
              {dayWorkouts.map((workout) => (
                <Link
                  to={toWorkoutPath(workout)}
                  key={workout.id}
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
              ))}
            </div>
          </div>
        );
        day = new Date(day.getTime() + 24 * 60 * 60 * 1000); // Add one day
      }
      rows.push(
        <div className={styles.calendarRow} key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className={styles.calendarBody}>{rows}</div>;
  };

  return (
    <div className={styles.calendar}>
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
};

export default CalendarView;
