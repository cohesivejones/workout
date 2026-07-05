import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { fetchWorkout, deleteWorkout } from '../api';
import { Workout } from '../types';
import styles from './WorkoutShowPage.module.css';
import { format } from 'date-fns';
import classNames from 'classnames';
import { FaTrophy } from 'react-icons/fa';
import { toHomePath, toWorkoutEditPath, toExerciseProgressionPath } from '../utils/paths';
import { formatWeightWithKg } from '../utils/weight';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

const WorkoutShowPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const workoutId = parseInt(id || '0');
  const [, setLocation] = useLocation();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    const loadWorkout = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchWorkout(workoutId);
        setWorkout(data);
      } catch (err) {
        console.error('Failed to load workout:', err);
        setError(err instanceof Error ? err.message : 'Failed to load workout');
      } finally {
        setLoading(false);
      }
    };

    loadWorkout();
  }, [workoutId]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this workout?')) {
      try {
        setIsDeleting(true);
        await deleteWorkout(workoutId);
        setLocation('/');
      } catch (err) {
        console.error('Failed to delete workout:', err);
        alert('Failed to delete workout. Please try again.');
        setIsDeleting(false);
      }
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading workout details...</div>;
  }

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  if (!workout) {
    return <div className={styles.errorMessage}>Workout not found</div>;
  }

  return (
    <div className={styles.workoutShowPage}>
      <div className={styles.pageHeader}>
        <h2>Workout Details</h2>
        <div className={styles.pageActions}>
          <Button to={toHomePath()} variant="tertiary" className={styles.button}>
            Back to List
          </Button>
        </div>
      </div>

      <div
        className={classNames(styles.workoutDetailCard, {
          [styles.withInstructor]: workout.withInstructor,
        })}
      >
        <div className={styles.workoutDetailHeader}>
          <h3>{format(`${workout.date}T12:00:00.000`, 'MMM d, yyyy (eeee)')}</h3>
          {workout.withInstructor && <Badge variant="primary">With Instructor</Badge>}
        </div>

        <div className={styles.workoutDetailContent}>
          <h4>Exercises</h4>
          {workout.exercises.length === 0 ? (
            <p>No exercises recorded for this workout.</p>
          ) : (
            <ul className={styles.exerciseDetailList}>
              {workout.exercises.map((exercise, index) => {
                const isPR = exercise.newReps || exercise.newWeight || exercise.newTime;
                return (
                  <li
                    key={index}
                    className={classNames(styles.exerciseDetailItem, { [styles.prItem]: isPR })}
                  >
                    <div className={styles.exerciseDetailName}>
                      {exercise.id ? (
                        <Link to={toExerciseProgressionPath(exercise.id)}>{exercise.name}</Link>
                      ) : (
                        exercise.name
                      )}
                    </div>
                    <div className={styles.exerciseDetailStats}>
                      <span className={styles.exerciseDetailReps}>{exercise.reps} reps</span>
                      {exercise.weight && (
                        <span className={styles.exerciseDetailWeight}>
                          {formatWeightWithKg(exercise.weight)}
                        </span>
                      )}
                      {exercise.timeSeconds && (
                        <span className={styles.exerciseDetailTime}>
                          {exercise.timeSeconds} sec
                        </span>
                      )}
                      {isPR && (
                        <div className={styles.badgeContainer}>
                          <FaTrophy
                            className={styles.prTrophy}
                            aria-hidden="true"
                            title="Personal record"
                          />
                          {exercise.newReps && (
                            <Badge variant="accent" size="sm">
                              NEW REPS
                            </Badge>
                          )}
                          {exercise.newWeight && (
                            <Badge variant="accent" size="sm">
                              NEW WEIGHT
                            </Badge>
                          )}
                          {exercise.newTime && (
                            <Badge variant="accent" size="sm">
                              NEW TIME
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={styles.workoutDetailActions}>
          <Button to={toWorkoutEditPath(workout)} variant="primary" className={styles.button}>
            Edit Workout
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            variant="secondary"
            className={styles.button}
          >
            {isDeleting ? 'Deleting...' : 'Delete Workout'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WorkoutShowPage;
