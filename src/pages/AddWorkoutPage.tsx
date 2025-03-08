import React from "react";
import { useNavigate } from "react-router-dom";
import WorkoutForm from "../components/WorkoutForm";
import { createWorkout, createExercise, fetchExercises } from "../api";
import { Workout } from "../types";

export default function AddWorkoutPage() {
  const navigate = useNavigate();
  const [savedExercises, setSavedExercises] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadExercises = async () => {
      try {
        const exercisesData = await fetchExercises();
        setSavedExercises(exercisesData.map((e) => e.name));
      } catch (err) {
        console.error("Failed to load exercises:", err);
        setError("Failed to load exercises. Please try again later.");
      }
    };
    loadExercises();
  }, []);

  const addWorkout = async (workout: Omit<Workout, "id">): Promise<boolean> => {
    try {
      setError(null);
      await createWorkout(workout as Workout);
      navigate("/");
      return true;
    } catch (err) {
      console.error("Failed to add workout:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to add workout. Please try again."
      );
      return false;
    }
  };

  const addExerciseToSaved = async (exerciseName: string): Promise<boolean> => {
    try {
      setError(null);
      if (!savedExercises.includes(exerciseName)) {
        const result = await createExercise(exerciseName);
        setSavedExercises((prev) => [...prev, result.name].sort());
        return true;
      }
      return true;
    } catch (err) {
      console.error("Failed to save exercise:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save exercise. Please try again."
      );
      return false;
    }
  };

  return (
    <div>
      {error && <div className="error-message">{error}</div>}
      <WorkoutForm
        onSubmit={addWorkout}
        savedExercises={savedExercises}
        onSaveExercise={addExerciseToSaved}
      />
    </div>
  );
}
