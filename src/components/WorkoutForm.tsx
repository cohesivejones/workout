import * as React from "react";
import { WorkoutFormProps, Status } from "../types";
import CreatableSelect from "react-select/creatable";
import "./WorkoutForm.css";

function WorkoutForm({
  onSubmit,
  savedExercises,
  onSaveExercise,
  existingWorkout,
}: WorkoutFormProps): React.ReactElement {
  const [exercises, setExercises] = React.useState<
    Array<{ name: string; reps: number; weight?: number | null }>
  >(existingWorkout?.exercises || []);
  const [currentExercise, setCurrentExercise] = React.useState<{
    name: string;
    reps: string;
    weight: string;
  }>({ name: "", reps: "", weight: "" });
  const [workoutDate, setWorkoutDate] = React.useState<string>(
    existingWorkout
      ? new Date(existingWorkout.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [withInstructor, setWithInstructor] = React.useState<boolean>(
    existingWorkout?.withInstructor || false
  );
  const [status, setStatus] = React.useState<Status>({
    loading: false,
    error: null,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (exercises.length === 0) return;

    setStatus({ loading: true, error: null });
    try {
      const success = await onSubmit({
        date: workoutDate,
        withInstructor,
        exercises: exercises.map((ex) => ({ ...ex, reps: Number(ex.reps) })),
      });

      if (success) {
        setExercises([]);
        setCurrentExercise({ name: "", reps: "", weight: "" });
      }
    } catch (err) {
      setStatus({
        loading: false,
        error: err instanceof Error ? err.message : "An error occurred",
      });
    }
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
          setExercises([
            ...exercises,
            {
              name,
              reps: Number(currentExercise.reps),
              weight: currentExercise.weight
                ? Number(currentExercise.weight)
                : null,
            },
          ]);
          setCurrentExercise({ name: "", reps: "", weight: "" });
        }
      } catch (err) {
        setStatus({
          loading: false,
          error: err instanceof Error ? err.message : "An error occurred",
        });
      }
      setStatus({ loading: false, error: null });
    }
  };

  interface SelectOption {
    label: string;
    value: string;
  }

  const handleExerciseChange = (newValue: SelectOption | null) => {
    if (newValue) {
      setCurrentExercise({ ...currentExercise, name: newValue.value });
    } else {
      setCurrentExercise({ ...currentExercise, name: "" });
    }
  };

  return (
    <div className="workout-form">
      <h2>{existingWorkout ? "Edit Workout" : "Add New Workout"}</h2>
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
        <div className="instructor-checkbox">
          <label htmlFor="with-instructor">
            <input
              type="checkbox"
              id="with-instructor"
              checked={withInstructor}
              onChange={(e) => setWithInstructor(e.target.checked)}
            />
            With Instructor
          </label>
        </div>
        <div className="exercise-input">
          <CreatableSelect
            isClearable
            placeholder="Select or create an exercise"
            options={savedExercises.map((exercise) => ({
              label: exercise,
              value: exercise,
            }))}
            onChange={handleExerciseChange}
            value={
              currentExercise.name
                ? { label: currentExercise.name, value: currentExercise.name }
                : null
            }
            className="react-select-container"
            classNamePrefix="react-select"
            formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
          />
          <input
            type="number"
            placeholder="Reps"
            value={currentExercise.reps}
            onChange={(e) =>
              setCurrentExercise({ ...currentExercise, reps: e.target.value })
            }
            min="1"
            className="exercise-input-field"
          />
          <input
            type="number"
            placeholder="Weight (lbs)"
            value={currentExercise.weight}
            onChange={(e) =>
              setCurrentExercise({ ...currentExercise, weight: e.target.value })
            }
            min="0"
            step="0.5"
            className="exercise-input-field"
          />
          <button
            type="button"
            onClick={addExercise}
            disabled={
              !currentExercise.name || !currentExercise.reps || status.loading
            }
            className="add-exercise-btn"
          >
            {status.loading ? "Adding..." : "Add Exercise"}
          </button>
        </div>

        <div className="exercise-list">
          <h3>Current Exercises:</h3>
          {exercises.length === 0 ? (
            <p>No exercises added yet</p>
          ) : (
            <ul>
              {exercises.map((exercise, index) => (
                <li key={index} className="exercise-item">
                  <div className="exercise-info">
                    {exercise.name} - {exercise.reps} reps
                    {exercise.weight ? ` - ${exercise.weight} lbs` : ""}
                  </div>
                  <button
                    type="button"
                    className="remove-exercise-btn"
                    onClick={() => {
                      setExercises(exercises.filter((_, i) => i !== index));
                    }}
                  >
                    ×
                  </button>
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
          {status.loading
            ? "Saving..."
            : existingWorkout
            ? "Update Workout"
            : "Save Workout"}
        </button>
      </form>
    </div>
  );
}

export default WorkoutForm;
