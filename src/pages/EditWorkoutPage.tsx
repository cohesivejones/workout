import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import WorkoutForm from '../components/WorkoutForm';
import { fetchWorkout, updateWorkout, createExercise, fetchExercises } from '../api';
import { Exercise, Workout } from '../types';
import { useUserContext } from '../contexts/useUserContext';
import styles from '../components/WorkoutForm.module.css';
import loadingStyles from '../App.module.css';

export default function EditWorkoutPage() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const workoutId = parseInt(id || '0');
  const { user } = useUserContext();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [savedExercises, setSavedExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user) return;
        setLoading(true);
        setError(null);

        // Load the specific workout we're editing
        const foundWorkout = await fetchWorkout(workoutId);

        if (!foundWorkout) {
          setError(`Workout with ID ${workoutId} not found`);
          setLoading(false);
          return;
        }

        setWorkout(foundWorkout);

        // Load exercises
        const exercisesData = await fetchExercises();
        setSavedExercises(exercisesData);

        setLoading(false);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };

    loadData();
  }, [workoutId, user]);

  const handleUpdateWorkout = async (updatedWorkout: Omit<Workout, 'id'>): Promise<boolean> => {
    try {
      setError(null);
      await updateWorkout(workoutId, updatedWorkout);
      setLocation('/');
      return true;
    } catch (err) {
      console.error('Failed to update workout:', err);
      setError(err instanceof Error ? err.message : 'Failed to update workout. Please try again.');
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
      console.error('Failed to save exercise:', err);
      setError(err instanceof Error ? err.message : 'Failed to save exercise. Please try again.');
      return false;
    }
  };

  if (loading) {
    return <div className={loadingStyles.loading}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  const handleCancel = () => {
    setLocation('/');
  };

  if (!workout) {
    return <div className={styles.errorMessage}>Workout not found</div>;
  }

  return (
    <div>
      <WorkoutForm
        onSubmit={handleUpdateWorkout}
        savedExercises={savedExercises}
        onSaveExercise={addExerciseToSaved}
        existingWorkout={workout}
        onCancel={handleCancel}
      />
    </div>
  );
}
