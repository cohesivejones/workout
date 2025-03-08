import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import WorkoutForm from '../components/WorkoutForm';
import { fetchWorkouts, updateWorkout, createExercise, fetchExercises } from '../api';
import { Workout } from '../types';

export default function EditWorkoutPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const workoutId = parseInt(id || '0');
  
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [savedExercises, setSavedExercises] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load workouts and find the one we're editing
        const workoutsData = await fetchWorkouts();
        const foundWorkout = workoutsData.find(w => w.id === workoutId);
        
        if (!foundWorkout) {
          setError(`Workout with ID ${workoutId} not found`);
          setLoading(false);
          return;
        }
        
        setWorkout(foundWorkout);
        
        // Load exercises
        const exercisesData = await fetchExercises();
        setSavedExercises(exercisesData.map(e => e.name));
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };
    
    loadData();
  }, [workoutId]);

  const handleUpdateWorkout = async (updatedWorkout: Omit<Workout, 'id'>): Promise<boolean> => {
    try {
      setError(null);
      await updateWorkout(workoutId, updatedWorkout);
      navigate('/');
      return true;
    } catch (err) {
      console.error('Failed to update workout:', err);
      setError(err instanceof Error ? err.message : 'Failed to update workout. Please try again.');
      return false;
    }
  };

  const addExerciseToSaved = async (exerciseName: string): Promise<boolean> => {
    try {
      setError(null);
      if (!savedExercises.includes(exerciseName)) {
        const result = await createExercise(exerciseName);
        setSavedExercises(prev => [...prev, result.name].sort());
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
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!workout) {
    return <div className="error-message">Workout not found</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Edit Workout</h2>
      </div>
      <WorkoutForm 
        onSubmit={handleUpdateWorkout}
        savedExercises={savedExercises}
        onSaveExercise={addExerciseToSaved}
        existingWorkout={workout}
      />
    </div>
  );
}
