import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import WorkoutForm from "../components/WorkoutForm";
import { createWorkout, createExercise, fetchExercises } from "../api";
import { Exercise, Workout } from "../types";
import { useUserContext } from "../contexts/useUserContext";
import styles from "../components/WorkoutForm.module.css";

export default function AddWorkoutPage() {
  const navigate = useNavigate();
  const [savedExercises, setSavedExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUserContext();

  useEffect(() => {
    const loadExercises = async () => {
      try {
        if (!user) return;
        const exercisesData = await fetchExercises();
        setSavedExercises(exercisesData);
      } catch (err) {
        console.error("Failed to load exercises:", err);
        setError("Failed to load exercises. Please try again later.");
      }
    };
    loadExercises();
  }, [user]);

  const addWorkout = async (workout: Omit<Workout, "id">): Promise<boolean> => {
    try {
      setError(null);
      await createWorkout(workout as Workout);
      navigate("/");
      return true;
    } catch (err) {
      console.error("Failed to add workout:", err);
      setError(err instanceof Error ? err.message : "Failed to add workout. Please try again.");
      return false;
    }
  };

  const addExerciseToSaved = async (exerciseName: string): Promise<boolean> => {
    try {
      if (!user) return false;
      setError(null);
      if (!savedExercises.find((e) => e.name === exerciseName)) {
        const result = await createExercise(exerciseName);
        setSavedExercises((prev) => [...prev, result].sort());
        return true;
      }
      return true;
    } catch (err) {
      console.error("Failed to save exercise:", err);
      setError(err instanceof Error ? err.message : "Failed to save exercise. Please try again.");
      return false;
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  return (
    <div className={styles.container}>
      {error && <div className={styles.errorMessage}>{error}</div>}
      <WorkoutForm
        onSubmit={addWorkout}
        savedExercises={savedExercises}
        onSaveExercise={addExerciseToSaved}
        onCancel={handleCancel}
      />
    </div>
  );
}
