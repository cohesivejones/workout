import React, { useState } from 'react';

function WorkoutForm({ onSubmit, savedExercises, onSaveExercise }) {
  const [exercises, setExercises] = useState([]);
  const [currentExercise, setCurrentExercise] = useState({ name: '', reps: '' });
  const [isNewExercise, setIsNewExercise] = useState(false);
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (exercises.length === 0) return;
    
    onSubmit({
      date: workoutDate,
      exercises: exercises
    });
    
    setExercises([]);
    setCurrentExercise({ name: '', reps: '' });
  };

  const addExercise = (e) => {
    e.preventDefault();
    if (!currentExercise.name || !currentExercise.reps) return;
    
    const exerciseName = currentExercise.name.trim();
    if (exerciseName) {
      setExercises([...exercises, { ...currentExercise, name: exerciseName }]);
      onSaveExercise(exerciseName);
      setCurrentExercise({ name: '', reps: '' });
    }
  };

  return (
    <div className="workout-form">
      <h2>Add New Workout</h2>
      <form onSubmit={handleSubmit}>
        <div className="date-input">
          <label htmlFor="workout-date">Workout Date:</label>
          <input
            type="date"
            id="workout-date"
            value={workoutDate}
            onChange={(e) => setWorkoutDate(e.target.value)}
            className="exercise-input-field"
          />
        </div>
        <div className="exercise-input">
          <div className="exercise-type-toggle">
            <button 
              type="button" 
              className={!isNewExercise ? 'active' : ''} 
              onClick={() => setIsNewExercise(false)}
            >
              Select Exercise
            </button>
            <button 
              type="button" 
              className={isNewExercise ? 'active' : ''} 
              onClick={() => setIsNewExercise(true)}
            >
              Add New Exercise
            </button>
          </div>

          {isNewExercise ? (
            <input
              type="text"
              placeholder="Enter exercise name"
              value={currentExercise.name}
              onChange={(e) => setCurrentExercise({ ...currentExercise, name: e.target.value })}
              className="exercise-input-field"
            />
          ) : (
            <select
              value={currentExercise.name}
              onChange={(e) => setCurrentExercise({ ...currentExercise, name: e.target.value })}
              className="exercise-input-field"
            >
              <option value="">Select Exercise</option>
              {savedExercises.map((exercise, index) => (
                <option key={index} value={exercise}>{exercise}</option>
              ))}
            </select>
          )}
          <input
            type="number"
            placeholder="Reps"
            value={currentExercise.reps}
            onChange={(e) => setCurrentExercise({ ...currentExercise, reps: e.target.value })}
            min="1"
            className="exercise-input-field"
          />
          <button 
            type="button" 
            onClick={addExercise}
            disabled={!currentExercise.name || !currentExercise.reps}
            className="add-exercise-btn"
          >
            Add Exercise
          </button>
        </div>

        <div className="exercise-list">
          <h3>Current Exercises:</h3>
          {exercises.length === 0 ? (
            <p>No exercises added yet</p>
          ) : (
            <ul>
              {exercises.map((exercise, index) => (
                <li key={index}>
                  {exercise.name} - {exercise.reps} reps
                </li>
              ))}
            </ul>
          )}
        </div>

        <button 
          type="submit" 
          disabled={exercises.length === 0}
          className="save-workout-btn"
        >
          Save Workout
        </button>
      </form>
    </div>
  );
}

export default WorkoutForm;
