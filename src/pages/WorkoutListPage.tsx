import React, { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import WorkoutList from '../components/WorkoutList';
import { fetchWorkouts } from '../api';
import { Workout } from '../types';

function WorkoutListPage(): ReactElement {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkouts = async () => {
      try {
        const workoutsData = await fetchWorkouts();
        setWorkouts(workoutsData);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load workouts:', err);
        setError('Failed to load workouts. Please try again later.');
        setLoading(false);
      }
    };
    loadWorkouts();
  }, []);

  const handleWorkoutDeleted = (workoutId: number) => {
    setWorkouts(prevWorkouts => prevWorkouts.filter(w => w.id !== workoutId));
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Your Workouts</h2>
        <Link to="/add" className="button">Add New Workout</Link>
      </div>
      {error && <div className="error-message">{error}</div>}
      <WorkoutList 
        workouts={workouts} 
        onWorkoutDeleted={handleWorkoutDeleted}
      />
    </div>
  );
}

export default WorkoutListPage;
