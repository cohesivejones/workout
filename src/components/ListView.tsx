import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { MdOutlineEdit } from 'react-icons/md';
import { PainScore, Workout, SleepScore } from '../types';
import {
  toPainScoreNewPath,
  toPainScoreEditPath,
  toWorkoutEditPath,
  toWorkoutNewPath,
  toSleepScoreNewPath,
  toSleepScoreEditPath,
} from '../utils/paths';
import { deletePainScore, deleteWorkout, deleteSleepScore } from '../api';
import classNames from 'classnames';
import styles from './ListView.module.css';
import buttonStyles from '../styles/common/buttons.module.css';

interface ListViewProps {
  painScores: PainScore[];
  handlePainScoreDelete: (painScoreId: number) => void;
  sleepScores: SleepScore[];
  handleSleepScoreDelete: (sleepScoreId: number) => void;
  workouts: Workout[];
  handleWorkoutDeleted: (workoutId: number) => void;
}

type ListItem =
  | { type: 'workout'; data: Workout }
  | { type: 'painScore'; data: PainScore }
  | { type: 'sleepScore'; data: SleepScore };

export const ListView = ({
  painScores,
  handlePainScoreDelete,
  sleepScores,
  handleSleepScoreDelete,
  workouts,
  handleWorkoutDeleted,
}: ListViewProps) => {
  const [showWorkouts, setShowWorkouts] = useState(true);
  const [showPainScores, setShowPainScores] = useState(true);
  const [showSleepScores, setShowSleepScores] = useState(true);

  const [isDeleting, setIsDeleting] = useState<{
    type: string;
    id: number;
  } | null>(null);

  // Combine workouts, pain scores, and sleep scores into a single array
  const allItems: ListItem[] = [
    ...workouts.map((workout) => ({ type: 'workout' as const, data: workout })),
    ...painScores.map((painScore) => ({
      type: 'painScore' as const,
      data: painScore,
    })),
    ...sleepScores.map((sleepScore) => ({
      type: 'sleepScore' as const,
      data: sleepScore,
    })),
  ];

  // Filter items based on filter state
  const items = allItems.filter((item) => {
    if (item.type === 'workout' && !showWorkouts) return false;
    if (item.type === 'painScore' && !showPainScores) return false;
    if (item.type === 'sleepScore' && !showSleepScores) return false;
    return true;
  });

  // Sort by date in descending order (newest first)
  items.sort((a, b) => {
    const dateA = new Date(a.type === 'workout' ? a.data.date : a.data.date);
    const dateB = new Date(b.type === 'workout' ? b.data.date : b.data.date);
    return dateB.getTime() - dateA.getTime();
  });

  // Function to get color based on pain score
  const getPainScoreColor = (score: number): string => {
    if (score === 0) return '#4caf50'; // Green for no pain
    if (score <= 3) return '#8bc34a'; // Light green for mild pain
    if (score <= 5) return '#ffc107'; // Yellow for moderate pain
    if (score <= 7) return '#ff9800'; // Orange for severe pain
    return '#f44336'; // Red for extreme pain
  };

  // Function to get pain score description
  const getPainScoreDescription = (score: number): string => {
    const descriptions = [
      'Pain free',
      'Very mild pain, barely noticeable',
      'Minor pain with occasional stronger twinges',
      'Noticeable and distracting pain',
      'Moderate pain, can be ignored temporarily',
      "Moderately strong pain, can't be ignored for long",
      'Moderately strong pain interfering with daily activities',
      'Severe pain limiting normal activities',
      'Intense pain, physical activity severely limited',
      'Excruciating pain, unable to converse normally',
      'Unspeakable pain, bedridden',
    ];
    return descriptions[score] || '';
  };

  // Function to get sleep score description
  const getSleepScoreDescription = (score: number): string => {
    const descriptions = [
      '', // No 0 index for sleep scores
      'Very Poor - Sleep was highly fragmented and interrupted, with many awakenings and very little restorative deep sleep.',
      'Poor - Sleep was frequently interrupted, with many awakenings and periods of light sleep.',
      'Fair - Sleep had some interruptions, with periods of lighter sleep or more frequent awakenings.',
      'Good - Sleep was generally continuous, with only occasional brief awakenings or light sleep phases.',
      'Excellent - Sleep was consistently uninterrupted and restorative, with minimal or no awakenings throughout the night.',
    ];
    return descriptions[score] || '';
  };

  // Function to get color based on sleep score
  const getSleepScoreColor = (score: number): string => {
    switch (score) {
      case 5:
        return '#4caf50'; // Green for excellent sleep
      case 4:
        return '#8bc34a'; // Light green for good sleep
      case 3:
        return '#ffc107'; // Yellow for fair sleep
      case 2:
        return '#ff9800'; // Orange for poor sleep
      case 1:
        return '#f44336'; // Red for very poor sleep
      default:
        return '#ffc107'; // Default to yellow
    }
  };

  const handleDeleteWorkout = async (workoutId: number) => {
    if (window.confirm('Are you sure you want to delete this workout?')) {
      try {
        setIsDeleting({ type: 'workout', id: workoutId });
        await deleteWorkout(workoutId);
        handleWorkoutDeleted(workoutId);
      } catch (err) {
        console.error('Failed to delete workout:', err);
        alert('Failed to delete workout. Please try again.');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleDeletePainScore = async (painScoreId: number) => {
    if (window.confirm('Are you sure you want to delete this pain score?')) {
      try {
        setIsDeleting({ type: 'painScore', id: painScoreId });
        await deletePainScore(painScoreId);
        handlePainScoreDelete(painScoreId);
      } catch (err) {
        console.error('Failed to delete pain score:', err);
        alert('Failed to delete pain score. Please try again.');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleDeleteSleepScore = async (sleepScoreId: number) => {
    if (window.confirm('Are you sure you want to delete this sleep score?')) {
      try {
        setIsDeleting({ type: 'sleepScore', id: sleepScoreId });
        await deleteSleepScore(sleepScoreId);
        handleSleepScoreDelete(sleepScoreId);
      } catch (err) {
        console.error('Failed to delete sleep score:', err);
        alert('Failed to delete sleep score. Please try again.');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  // Reset all filters to show everything
  const showAll = () => {
    setShowWorkouts(true);
    setShowPainScores(true);
    setShowSleepScores(true);
  };

  return (
    <div className={styles.chronologicalList}>
      <div className={styles.sectionHeader}>
        <div className={styles.filterControls}>
          <div className={styles.filterLabel}>Filter by Type:</div>
          <div className={styles.filterCheckboxes}>
            <label className={styles.filterCheckbox}>
              <input
                type="checkbox"
                checked={showWorkouts}
                onChange={(e) => setShowWorkouts(e.target.checked)}
              />
              Workouts
            </label>
            <label className={styles.filterCheckbox}>
              <input
                type="checkbox"
                checked={showPainScores}
                onChange={(e) => setShowPainScores(e.target.checked)}
              />
              Pain Scores
            </label>
            <label className={styles.filterCheckbox}>
              <input
                type="checkbox"
                checked={showSleepScores}
                onChange={(e) => setShowSleepScores(e.target.checked)}
              />
              Sleep Scores
            </label>
            <button
              onClick={showAll}
              className={classNames(buttonStyles.secondaryBtn, styles.showAllBtn)}
            >
              Show All
            </button>
          </div>
        </div>
        <div className={styles.actionButtons}>
          <Link
            to={toWorkoutNewPath()}
            className={classNames(styles.addBtn, buttonStyles.primaryBtn)}
          >
            New Workout
          </Link>
          <Link
            to={toPainScoreNewPath()}
            className={classNames(styles.addBtn, buttonStyles.secondaryBtn)}
          >
            New Pain Score
          </Link>
          <Link
            to={toSleepScoreNewPath()}
            className={classNames(styles.addBtn, buttonStyles.secondaryBtn)}
          >
            New Sleep Score
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <p>No workouts, pain scores, or sleep scores recorded yet.</p>
      ) : (
        <div className={styles.listItems}>
          {items.map((item) => {
            if (item.type === 'workout') {
              const workout = item.data;
              return (
                <div
                  key={`workout-${workout.id}`}
                  data-testid={`workout-card-${workout.date}`}
                  className={classNames(styles.listCard, styles.workoutCard, {
                    [styles.withInstructor]: workout.withInstructor,
                  })}
                >
                  <div className={styles.listCardHeader}>
                    <div className={styles.listCardType}>Workout</div>
                    <h3>
                      {format(`${workout.date}T12:00:00.000`, 'MMM d, yyyy (eeee)')}
                      {workout.withInstructor && (
                        <span className={styles.srOnly}>With Instructor</span>
                      )}
                    </h3>
                    <div className={styles.listCardActions}>
                      <Link
                        to={toWorkoutEditPath(workout)}
                        className={classNames(styles.editBtn, buttonStyles.tertiaryIconBtn)}
                        title="Edit workout"
                      >
                        <MdOutlineEdit />
                      </Link>
                      <button
                        onClick={() => handleDeleteWorkout(workout.id)}
                        disabled={isDeleting?.type === 'workout' && isDeleting.id === workout.id}
                        className={classNames(styles.deleteBtn, buttonStyles.secondaryIconBtn)}
                        title="Delete workout"
                      >
                        {isDeleting?.type === 'workout' && isDeleting.id === workout.id
                          ? '...'
                          : 'x'}
                      </button>
                    </div>
                  </div>
                  <div className={styles.listCardContent}>
                    <div className={styles.exercisesList}>
                      {(workout.exercises || [])
                        .filter((ex) => ex)
                        .map((exercise, idx) => (
                          <div key={idx} className={styles.exerciseItem}>
                            <span className={styles.exerciseName}>{exercise.name}</span>
                            <span className={styles.exerciseDetails}>
                              {exercise.reps} reps
                              {exercise.weight ? ` - ${exercise.weight} lbs` : ''}
                              {exercise.time_minutes ? ` - ${exercise.time_minutes} min` : ''}
                            </span>
                            <div className={styles.badgeContainer}>
                              {exercise.new_reps && (
                                <span className={styles.newBadge}>NEW REPS</span>
                              )}
                              {exercise.new_weight && (
                                <span className={styles.newBadge}>NEW WEIGHT</span>
                              )}
                              {exercise.new_time && (
                                <span className={styles.newBadge}>NEW TIME</span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              );
            } else if (item.type === 'painScore') {
              const painScore = item.data;
              return (
                <div
                  key={`pain-score-${painScore.id}`}
                  className={classNames(styles.listCard, styles.painScoreCard)}
                  style={{
                    borderLeftColor: getPainScoreColor(painScore.score),
                  }}
                >
                  <div className={styles.listCardHeader}>
                    <div className={styles.listCardType}>Pain Score</div>
                    <h3>{format(`${painScore.date}T12:00:00.000`, 'MMM d, yyyy (eeee)')}</h3>
                    <div className={styles.listCardActions}>
                      <Link
                        to={toPainScoreEditPath(painScore)}
                        className={classNames(styles.editBtn, buttonStyles.tertiaryIconBtn)}
                        title="Edit pain score"
                      >
                        <MdOutlineEdit />
                      </Link>
                      <button
                        onClick={() => handleDeletePainScore(painScore.id)}
                        disabled={
                          isDeleting?.type === 'painScore' && isDeleting.id === painScore.id
                        }
                        className={classNames(styles.deleteBtn, buttonStyles.secondaryIconBtn)}
                        title="Delete pain score"
                      >
                        {isDeleting?.type === 'painScore' && isDeleting.id === painScore.id
                          ? '...'
                          : 'x'}
                      </button>
                    </div>
                  </div>
                  <div className={styles.listCardContent}>
                    <div className={styles.painScoreInfo}>
                      <span className={styles.painScoreLabel}>Pain Level:</span>
                      <span className={styles.painScoreValue}>
                        {painScore.score} - {getPainScoreDescription(painScore.score)}
                      </span>
                    </div>
                    {painScore.notes && (
                      <div className={styles.painScoreInfo}>
                        <span className={styles.painScoreLabel}>Notes:</span>
                        <span className={styles.painScoreValue}>{painScore.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            } else {
              const sleepScore = item.data;
              return (
                <div
                  key={`sleep-score-${sleepScore.id}`}
                  className={classNames(styles.listCard, styles.sleepScoreCard)}
                  style={{
                    borderLeftColor: getSleepScoreColor(sleepScore.score),
                  }}
                >
                  <div className={styles.listCardHeader}>
                    <div className={styles.listCardType}>Sleep Score</div>
                    <h3>{format(`${sleepScore.date}T12:00:00.000`, 'MMM d, yyyy (eeee)')}</h3>
                    <div className={styles.listCardActions}>
                      <Link
                        to={toSleepScoreEditPath(sleepScore)}
                        className={classNames(styles.editBtn, buttonStyles.tertiaryIconBtn)}
                        title="Edit sleep score"
                      >
                        <MdOutlineEdit />
                      </Link>
                      <button
                        onClick={() => handleDeleteSleepScore(sleepScore.id)}
                        disabled={
                          isDeleting?.type === 'sleepScore' && isDeleting.id === sleepScore.id
                        }
                        className={classNames(styles.deleteBtn, buttonStyles.secondaryIconBtn)}
                        title="Delete sleep score"
                      >
                        {isDeleting?.type === 'sleepScore' && isDeleting.id === sleepScore.id
                          ? '...'
                          : 'x'}
                      </button>
                    </div>
                  </div>
                  <div className={styles.listCardContent}>
                    <div className={styles.sleepScoreInfo}>
                      <span className={styles.sleepScoreLabel}>Sleep Quality:</span>
                      <span className={styles.sleepScoreValue}>
                        {sleepScore.score} - {getSleepScoreDescription(sleepScore.score)}
                      </span>
                    </div>
                    <div className={styles.sleepScoreNote}>
                      <span className={styles.sleepScoreNoteText}>
                        Note: This score reflects sleep from the previous night/this morning.
                      </span>
                    </div>
                    {sleepScore.notes && (
                      <div className={styles.sleepScoreInfo}>
                        <span className={styles.sleepScoreLabel}>Notes:</span>
                        <span className={styles.sleepScoreValue}>{sleepScore.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
};
