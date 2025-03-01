import * as React from 'react';
import { WorkoutFormProps, Status } from '../types';
import CreatableSelect from 'react-select/creatable';

interface OptionType {
  label: string;
  value: string;
}

function WorkoutForm({ onSubmit, savedExercises, onSaveExercise }: WorkoutFormProps): React.ReactElement {
  const [exercises, setExercises] = React.useState<Array<{ name: string; reps: number }>>([]);
  const [currentExercise, setCurrentExercise] = React.useState<{ name: string; reps: string }>({ name: '', reps: '' });
  const [workoutDate, setWorkoutDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = React.useState<Status>({ loading: false, error: null });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (exercises.length === 0) return;
    
    setStatus({ loading: true, error: null });
    try {
      const success = await onSubmit({
        date: workoutDate,
        exercises: exercises.map(ex => ({ ...ex, reps: Number(ex.reps) }))
      });
      
      if (success) {
        setExercises([]);
        setCurrentExercise({ name: '', reps: '' });
      }
    } catch (err) {
      setStatus({ loading: false, error: err instanceof Error ? err.message : 'An error occurred' });
    }
    setStatus({ loading: false, error: null });
  };

  const addExercise = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!currentExercise.name || !currentExercise.reps) return;
    
    const name = currentExercise.name.trim();
    if (name) {
      setStatus({ loading: true, error: null });
      try {
        const success = await onSaveExercise(name);
        if (success) {
          setExercises([...exercises, { name, reps: Number(currentExercise.reps) }]);
          setCurrentExercise({ name: '', reps: '' });
        }
      } catch (err) {
        setStatus({ loading: false, error: err instanceof Error ? err.message : 'An error occurred' });
      }
      setStatus({ loading: false, error: null });
    }
  };

  const handleExerciseChange = (newValue: any) => {
    if (newValue) {
      setCurrentExercise({ ...currentExercise, name: newValue.value });
    } else {
      setCurrentExercise({ ...currentExercise, name: '' });
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
          <CreatableSelect
            isClearable
            placeholder="Select or create an exercise"
            options={savedExercises.map(exercise => ({ label: exercise, value: exercise }))}
            onChange={handleExerciseChange}
            value={currentExercise.name ? { label: currentExercise.name, value: currentExercise.name } : null}
            className="react-select-container"
            classNamePrefix="react-select"
            formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
          />
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
