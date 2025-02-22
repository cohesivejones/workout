import * as React from 'react';
import './App.css';
import WorkoutForm from './components/WorkoutForm';
import WorkoutList from './components/WorkoutList';
import { fetchWorkouts, fetchExercises, createWorkout, createExercise } from './api';
import { Workout } from './types';

function App(): React.ReactElement {
  const [workouts, setWorkouts] = React.useState<Workout[]>([]);
  const [savedExercises, setSavedExercises] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  
  // Load data from API on component mount
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [workoutsData, exercisesData] = await Promise.all([
          fetchWorkouts(),
          fetchExercises()
        ]);
        setWorkouts(workoutsData);
        setSavedExercises(exercisesData.map(e => e.name));
        setLoading(false);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const addWorkout = async (workout: Omit<Workout, 'id'>): Promise<boolean> => {
    try {
      setError(null);
      const newWorkout = await createWorkout(workout as Workout);
      setWorkouts(prevWorkouts => {
        const updatedWorkouts = [newWorkout, ...prevWorkouts];
        return updatedWorkouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
      return true;
    } catch (err) {
      console.error('Failed to add workout:', err);
      setError(err instanceof Error ? err.message : 'Failed to add workout. Please try again.');
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

  const handleWorkoutDeleted = (workoutId: number) => {
    setWorkouts(prevWorkouts => prevWorkouts.filter(w => w.id !== workoutId));
  };

  if (loading) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Workout Tracker</h1>
        </header>
        <main className="App-main">
          <div className="loading">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Workout Tracker</h1>
      </header>
      <main className="App-main">
        {error && <div className="error-message">{error}</div>}
        <div className="workout-container">
          <WorkoutForm 
            onSubmit={addWorkout} 
            savedExercises={savedExercises}
            onSaveExercise={addExerciseToSaved}
          />
          <WorkoutList 
            workouts={workouts} 
            onWorkoutDeleted={handleWorkoutDeleted}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
