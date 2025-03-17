import React, { useState } from "react";
import "./CalendarView.css";
import { Workout } from "../types";
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
import { Link } from "react-router-dom";
import { toWorkoutPath } from "../utils/paths";

interface CalendarViewProps {
  workouts: Workout[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ workouts }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Group workouts by date
  const workoutsByDate = workouts.reduce((acc, workout) => {
    const dateStr = workout.date.split("T")[0]; // Handle ISO date format
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(workout);
    return acc;
  }, {} as Record<string, Workout[]>);

  const renderHeader = () => {
    return (
      <div className="calendar-header">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          &lt;
        </button>
        <h2>{format(currentMonth, "MMMM yyyy")}</h2>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          &gt;
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return (
      <div className="calendar-days">
        {days.map((day) => (
          <div className="calendar-day-name" key={day}>
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

        days.push(
          <div
            className={classNames("calendar-cell", {
              disabled: !isSameMonth(day, monthStart),
              today: isToday(day),
            })}
            key={day.toString()}
          >
            <div className="calendar-date">{formattedDate}</div>
            <div className="calendar-workouts">
              {dayWorkouts.map((workout) => (
                <Link
                  to={toWorkoutPath(workout)}
                  key={workout.id}
                  className={classNames("calendar-workout", {
                    "with-instructor": workout.withInstructor,
                  })}
                >
                  <div className="workout-exercises">
                    {workout.exercises.map((exercise, idx) => (
                      <div key={idx} className="workout-exercise">
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
        <div className="calendar-row" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="calendar-body">{rows}</div>;
  };

  return (
    <div className="calendar">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
};

export default CalendarView;
