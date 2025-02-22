import React from 'react';

function WorkoutList({ workouts }) {
  return (
    <div className="workout-list">
      <h2>Your Workouts</h2>
      {workouts.length === 0 ? (
        <p>No workouts yet. Add your first workout!</p>
      ) : (
        <div className="workouts">
          {workouts.map(workout => (
            <div key={workout.id} className="workout-card">
              <h3>Workout on {workout.date}</h3>
              <ul>
                {workout.exercises.map((exercise, index) => (
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
