import React, { useState, useEffect } from 'react';
import './App.css';
import WorkoutForm from './components/WorkoutForm';
import WorkoutList from './components/WorkoutList';

function App() {
  const [workouts, setWorkouts] = useState([]);
  const [savedExercises, setSavedExercises] = useState([]);
  
  // Load saved data from localStorage on component mount
  useEffect(() => {
    const savedWorkouts = localStorage.getItem('workouts');
    const exerciseList = localStorage.getItem('savedExercises');
    
    if (savedWorkouts) {
      setWorkouts(JSON.parse(savedWorkouts));
    }
    if (exerciseList) {
      setSavedExercises(JSON.parse(exerciseList));
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('workouts', JSON.stringify(workouts));
  }, [workouts]);

  useEffect(() => {
    localStorage.setItem('savedExercises', JSON.stringify(savedExercises));
  }, [savedExercises]);

  const addWorkout = (workout) => {
    setWorkouts([...workouts, { ...workout, id: Date.now() }]);
  };

  const addExerciseToSaved = (exerciseName) => {
    if (!savedExercises.includes(exerciseName)) {
      setSavedExercises([...savedExercises, exerciseName]);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Workout Tracker</h1>
      </header>
      <main className="App-main">
        <div className="workout-container">
          <WorkoutForm 
            onSubmit={addWorkout} 
            savedExercises={savedExercises}
            onSaveExercise={addExerciseToSaved}
          />
          <WorkoutList workouts={workouts} />
        </div>
      </main>
    </div>
  );
}

export default App;
