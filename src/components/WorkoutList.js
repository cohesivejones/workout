import React from 'react';

function WorkoutList({ workouts }) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = days[date.getDay()];
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return `${formattedDate} (${day})`;
  };

  return (
    <div className="workout-list">
      <h2>Your Workouts</h2>
      {workouts.length === 0 ? (
        <p>No workouts yet. Add your first workout!</p>
      ) : (
        <div className="workouts">
          {workouts.map(workout => (
            <div key={workout.id} className="workout-card">
              <h3>Workout on {formatDate(workout.date)}</h3>
              <ul>
                {(workout.exercises || []).filter(ex => ex).map((exercise, index) => (
                  <li key={index}>
                    {exercise.name} - {exercise.reps} reps
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WorkoutList;
