import React, { useState, useEffect } from "react";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
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
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [isMobileView, setIsMobileView] = useState<boolean>(false);

  // Check screen size on mount and when window resizes
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    // Initial check
    checkScreenSize();

    // Add resize listener
    window.addEventListener("resize", checkScreenSize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  // Group workouts and pain scores by date
  const workoutsByDate = workouts.reduce(
    (acc, workout) => {
      const dateStr = workout.date.split("T")[0]; // Handle ISO date format
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(workout);
      return acc;
    },
    {} as Record<string, Workout[]>,
  );

  const painScoresByDate = painScores.reduce(
    (acc, painScore) => {
      const dateStr = painScore.date.split("T")[0]; // Handle ISO date format
      acc[dateStr] = painScore;
      return acc;
    },
    {} as Record<string, PainScore>,
  );

  // Function to get color based on pain score
  const getPainScoreColor = (score: number): string => {
    if (score === 0) return "#4caf50"; // Green for no pain
    if (score <= 3) return "#8bc34a"; // Light green for mild pain
    if (score <= 5) return "#ffc107"; // Yellow for moderate pain
    if (score <= 7) return "#ff9800"; // Orange for severe pain
    return "#f44336"; // Red for extreme pain
  };

  const renderMonthHeader = () => {
    return (
      <div className={styles.calendarHeader}>
        <div className={styles.navButtons}>
          <button
            className={styles.navButton}
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            aria-label="Previous month"
          >
            <MdChevronLeft />
          </button>
          <button
            className={styles.todayButton}
            onClick={() => setCurrentMonth(new Date())}
            aria-label="Go to today"
          >
            Today
          </button>
          <button
            className={styles.navButton}
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            aria-label="Next month"
          >
            <MdChevronRight />
          </button>
        </div>
        <h2 className={styles.monthTitle}>
          {format(currentMonth, "MMMM yyyy")}
        </h2>
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

  const renderWeekHeader = () => {
    return (
      <div className={styles.calendarHeader}>
        <div className={styles.navButtons}>
          <button
            className={styles.navButton}
            onClick={() => {
              const prevWeek = new Date(currentWeek);
              prevWeek.setDate(prevWeek.getDate() - 7);
              setCurrentWeek(prevWeek);
            }}
            aria-label="Previous week"
          >
            <MdChevronLeft />
          </button>
          <button
            className={styles.todayButton}
            onClick={() => setCurrentWeek(new Date())}
            aria-label="Go to today"
          >
            Today
          </button>
          <button
            className={styles.navButton}
            onClick={() => {
              const nextWeek = new Date(currentWeek);
              nextWeek.setDate(nextWeek.getDate() + 7);
              setCurrentWeek(nextWeek);
            }}
            aria-label="Next week"
          >
            <MdChevronRight />
          </button>
        </div>
        <h2 className={styles.monthTitle}>
          {format(currentWeek, "MMMM d")} -{" "}
          {format(
            new Date(currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000),
            "MMMM d, yyyy",
          )}
        </h2>
      </div>
    );
  };

  const renderGridCells = () => {
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
            key={day.toString()}
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
          </div>,
        );
        day = new Date(day.getTime() + 24 * 60 * 60 * 1000); // Add one day
      }
      rows.push(
        <div className={styles.calendarRow} key={day.toString()}>
          {days}
        </div>,
      );
      days = [];
    }
    return <div className={styles.calendarBody}>{rows}</div>;
  };

  const renderVerticalDays = () => {
    // Start from the beginning of the current week
    const startDate = startOfWeek(currentWeek);
    const days = [];

    // Generate 7 days (a full week)
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = format(day, "yyyy-MM-dd");
      const dayWorkouts = workoutsByDate[dateStr] || [];
      const painScore = painScoresByDate[dateStr];

      days.push(
        <div
          key={dateStr}
          className={classNames(styles.verticalDay, {
            [styles.today]: isToday(day),
          })}
        >
          <div className={styles.verticalDayHeader}>
            <div className={styles.verticalDayName}>{format(day, "EEEE")}</div>
            <div className={styles.verticalDayDate}>
              {format(day, "MMMM d, yyyy")}
            </div>
          </div>

          {painScore && (
            <button
              className={styles.verticalPainScore}
              style={{ backgroundColor: getPainScoreColor(painScore.score) }}
              onClick={() => navigate(toPainScoreEditPath(painScore))}
              aria-label={`Edit pain score ${painScore.score} for ${dateStr}`}
            >
              Pain: {painScore.score}
            </button>
          )}

          <div className={styles.verticalWorkouts}>
            {dayWorkouts.length > 0 ? (
              dayWorkouts.map((workout) => (
                <Link
                  to={toWorkoutPath(workout)}
                  key={workout.id}
                  className={classNames(styles.verticalWorkout, {
                    [styles.withInstructor]: workout.withInstructor,
                  })}
                >
                  <div className={styles.verticalWorkoutExercises}>
                    {workout.exercises.map((exercise, idx) => (
                      <div key={idx} className={styles.verticalWorkoutExercise}>
                        <span className={styles.exerciseName}>
                          {exercise.name}
                        </span>
                        <span className={styles.exerciseDetails}>
                          {exercise.reps} reps
                          {exercise.weight ? ` - ${exercise.weight} lbs` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </Link>
              ))
            ) : (
              <div className={styles.noWorkouts}>No workouts</div>
            )}
          </div>
        </div>,
      );
    }

    return <div className={styles.verticalDaysList}>{days}</div>;
  };

  return (
    <div className={styles.calendar}>
      {isMobileView ? (
        <>
          {renderWeekHeader()}
          {renderVerticalDays()}
        </>
      ) : (
        <>
          {renderMonthHeader()}
          {renderDays()}
          {renderGridCells()}
        </>
      )}
    </div>
  );
};

export default CalendarView;
