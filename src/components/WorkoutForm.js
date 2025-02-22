import React, { useState } from 'react';

function WorkoutForm({ onSubmit, savedExercises, onSaveExercise }) {
  const [exercises, setExercises] = useState([]);
  const [currentExercise, setCurrentExercise] = useState({ name: '', reps: '' });
  const [isNewExercise, setIsNewExercise] = useState(false);
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState({ loading: false, error: null });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (exercises.length === 0) return;
    
    setStatus({ loading: true, error: null });
    try {
      const success = await onSubmit({
        date: workoutDate,
        exercises: exercises
      });
      
      if (success) {
        setExercises([]);
        setCurrentExercise({ name: '', reps: '' });
      }
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    }
    setStatus({ loading: false, error: null });
  };

  const addExercise = async (e) => {
    e.preventDefault();
    if (!currentExercise.name || !currentExercise.reps) return;
    
    const name = currentExercise.name.trim();
    if (name) {
      setStatus({ loading: true, error: null });
      try {
        const success = await onSaveExercise(name);
        if (success) {
          setExercises([...exercises, { ...currentExercise, name }]);
          setCurrentExercise({ name: '', reps: '' });
          setIsNewExercise(false);
        }
      } catch (err) {
        setStatus({ loading: false, error: err.message });
      }
      setStatus({ loading: false, error: null });
    }
  };

  return (
    <div className="workout-form">
      <h2>Add New Workout</h2>
      {status.error && <div className="error-message">{status.error}</div>}
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
              autoFocus
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
            disabled={!currentExercise.name || !currentExercise.reps || status.loading}
            className="add-exercise-btn"
          >
            {status.loading ? 'Adding...' : 'Add Exercise'}
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
          disabled={exercises.length === 0 || status.loading}
          className="save-workout-btn"
        >
          {status.loading ? 'Saving...' : 'Save Workout'}
        </button>
      </form>
    </div>
  );
}

export default WorkoutForm;
