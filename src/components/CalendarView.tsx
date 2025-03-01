import React, { useState } from 'react';
import './CalendarView.css';
import { Workout } from '../types';
import { deleteWorkout } from '../api';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday
} from 'date-fns';

interface CalendarViewProps {
  workouts: Workout[];
  onWorkoutDeleted: (workoutId: number) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ workouts, onWorkoutDeleted }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  
  const handleDelete = async (workoutId: number) => {
    if (window.confirm('Are you sure you want to delete this workout?')) {
      try {
        setIsDeleting(workoutId);
        await deleteWorkout(workoutId);
        onWorkoutDeleted(workoutId);
      } catch (err) {
        console.error('Failed to delete workout:', err);
        alert('Failed to delete workout. Please try again.');
      } finally {
        setIsDeleting(null);
      }
    }
  };
  
  // Group workouts by date
  const workoutsByDate = workouts.reduce((acc, workout) => {
    const dateStr = workout.date.split('T')[0]; // Handle ISO date format
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
        <h2>{format(currentMonth, 'MMMM yyyy')}</h2>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          &gt;
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="calendar-days">
        {days.map(day => (
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

    const dateFormat = 'd';
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayWorkouts = workoutsByDate[dateStr] || [];
        
        days.push(
          <div
            className={`calendar-cell ${
              !isSameMonth(day, monthStart) ? 'disabled' : ''
            } ${isToday(day) ? 'today' : ''}`}
            key={day.toString()}
          >
            <div className="calendar-date">{formattedDate}</div>
            <div className="calendar-workouts">
              {dayWorkouts.map(workout => (
                <div 
                  key={workout.id} 
                  className={`calendar-workout ${workout.withInstructor ? 'with-instructor' : ''}`}
                >
                  <div className="workout-exercises">
                    {workout.exercises.map((exercise, idx) => (
                      <div key={idx} className="workout-exercise">
                        {exercise.name} - {exercise.reps} reps
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleDelete(workout.id)}
                    disabled={isDeleting === workout.id}
                    className="delete-btn"
                  >
                    {isDeleting === workout.id ? "..." : "×"}
                  </button>
                </div>
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
