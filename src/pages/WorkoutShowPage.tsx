import React, { useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { fetchWorkout, deleteWorkout } from '../api';
import styles from './WorkoutShowPage.module.css';
import { format } from 'date-fns';
import classNames from 'classnames';
import { FaTrophy, FaDumbbell } from 'react-icons/fa';
import { toHomePath, toWorkoutEditPath, toExerciseProgressionPath } from '../utils/paths';
import { formatWeightWithKg } from '../utils/weight';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useConfirm } from '../components/ui/useConfirm';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { useAsync } from '../hooks/useAsync';

const WorkoutShowPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const workoutId = parseInt(id || '0');
  const [, setLocation] = useLocation();

  const { data, loading, error } = useAsync(() => fetchWorkout(workoutId), [workoutId], {
    errorMessage: 'Failed to load workout',
  });
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const { confirm, alert, dialog } = useConfirm();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete workout?',
      message: 'This will permanently remove this workout. This can’t be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await deleteWorkout(workoutId);
      setLocation('/');
    } catch (err) {
      console.error('Failed to delete workout:', err);
      await alert({
        title: 'Delete failed',
        message: 'Failed to delete workout. Please try again.',
      });
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading workout details..." />;
  }

  if (error) {
    return <ErrorState>{error}</ErrorState>;
  }

  if (!data) {
    return <ErrorState>Workout not found</ErrorState>;
  }

  const workout = data;

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
            <EmptyState
              icon={<FaDumbbell />}
              title="No exercises recorded"
              message="This workout doesn’t have any exercises."
            />
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
      {dialog}
    </div>
  );
};

export default WorkoutShowPage;
