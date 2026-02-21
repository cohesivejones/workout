import { useRef, useEffect, useReducer } from 'react';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { MdOutlineEdit, MdAdd, MdFitnessCenter, MdLocalHospital, MdHotel } from 'react-icons/md';
import {
  toPainScoreNewPath,
  toPainScoreEditPath,
  toWorkoutEditPath,
  toWorkoutNewPath,
  toSleepScoreNewPath,
  toSleepScoreEditPath,
} from '../utils/paths';
import { deletePainScore, deleteWorkout, deleteSleepScore, fetchActivity } from '../api';
import classNames from 'classnames';
import styles from './ListView.module.css';
import buttonStyles from '../styles/common/buttons.module.css';
import { useUserContext } from '../contexts/useUserContext';
import { listViewReducer, createInitialListViewState } from './listView.reducer';
import { formatWeightWithKg } from '../utils/weight';

export const ListView = () => {
  const { user } = useUserContext();
  const [state, dispatch] = useReducer(listViewReducer, undefined, createInitialListViewState);
  const {
    activityItems,
    loading,
    error,
    currentOffset,
    isLoadingMore,
    totalCount,
    showWorkouts,
    showPainScores,
    showSleepScores,
    isDeleting,
    fabOpen,
  } = state;

  const fabRef = useRef<HTMLDivElement | null>(null);

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const activityData = await fetchActivity(0);
        dispatch({
          type: 'LOAD_INITIAL_DATA',
          payload: { items: activityData.items, total: activityData.total || 0 },
        });
      } catch (err) {
        console.error('Failed to load data:', err);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load data. Please try again later.' });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    loadData();
  }, [user]);

  const handleLoadMore = async () => {
    if (!user || isLoadingMore) return;

    dispatch({ type: 'SET_LOADING_MORE', payload: true });
    try {
      const nextOffset = currentOffset + 1;
      const activityData = await fetchActivity(nextOffset);

      dispatch({
        type: 'APPEND_DATA',
        payload: { items: activityData.items, total: activityData.total },
      });
    } catch (err) {
      console.error('Failed to load more data:', err);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load more data. Please try again later.' });
      dispatch({ type: 'SET_LOADING_MORE', payload: false });
    }
  };

  // Close FAB menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        dispatch({ type: 'SET_FAB_OPEN', payload: false });
      }
    };

    if (fabOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [fabOpen]);

  const handleWorkoutDeleted = (workoutId: number) => {
    dispatch({ type: 'DELETE_ITEM', payload: { type: 'workout', id: workoutId } });
  };

  const handlePainScoreDeleted = (painScoreId: number) => {
    dispatch({ type: 'DELETE_ITEM', payload: { type: 'painScore', id: painScoreId } });
  };

  const handleSleepScoreDeleted = (sleepScoreId: number) => {
    dispatch({ type: 'DELETE_ITEM', payload: { type: 'sleepScore', id: sleepScoreId } });
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  // Filter items based on filter state
  const items = activityItems.filter((item) => {
    if (item.type === 'workout' && !showWorkouts) return false;
    if (item.type === 'painScore' && !showPainScores) return false;
    if (item.type === 'sleepScore' && !showSleepScores) return false;
    return true;
  });

  // Items are already sorted by date descending from the API

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
        dispatch({ type: 'SET_DELETING', payload: { type: 'workout', id: workoutId } });
        await deleteWorkout(workoutId);
        handleWorkoutDeleted(workoutId);
      } catch (err) {
        console.error('Failed to delete workout:', err);
        alert('Failed to delete workout. Please try again.');
      } finally {
        dispatch({ type: 'SET_DELETING', payload: null });
      }
    }
  };

  const handleDeletePainScore = async (painScoreId: number) => {
    if (window.confirm('Are you sure you want to delete this pain score?')) {
      try {
        dispatch({ type: 'SET_DELETING', payload: { type: 'painScore', id: painScoreId } });
        await deletePainScore(painScoreId);
        handlePainScoreDeleted(painScoreId);
      } catch (err) {
        console.error('Failed to delete pain score:', err);
        alert('Failed to delete pain score. Please try again.');
      } finally {
        dispatch({ type: 'SET_DELETING', payload: null });
      }
    }
  };

  const handleDeleteSleepScore = async (sleepScoreId: number) => {
    if (window.confirm('Are you sure you want to delete this sleep score?')) {
      try {
        dispatch({ type: 'SET_DELETING', payload: { type: 'sleepScore', id: sleepScoreId } });
        await deleteSleepScore(sleepScoreId);
        handleSleepScoreDeleted(sleepScoreId);
      } catch (err) {
        console.error('Failed to delete sleep score:', err);
        alert('Failed to delete sleep score. Please try again.');
      } finally {
        dispatch({ type: 'SET_DELETING', payload: null });
      }
    }
  };

  // Reset all filters to show everything
  const showAll = () => {
    dispatch({ type: 'SHOW_ALL_FILTERS' });
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
                onChange={() => dispatch({ type: 'TOGGLE_FILTER', payload: 'workouts' })}
              />
              Workouts
            </label>
            <label className={styles.filterCheckbox}>
              <input
                type="checkbox"
                checked={showPainScores}
                onChange={() => dispatch({ type: 'TOGGLE_FILTER', payload: 'painScores' })}
              />
              Pain Scores
            </label>
            <label className={styles.filterCheckbox}>
              <input
                type="checkbox"
                checked={showSleepScores}
                onChange={() => dispatch({ type: 'TOGGLE_FILTER', payload: 'sleepScores' })}
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
      </div>

      {items.length === 0 ? (
        <p>No workouts, pain scores, or sleep scores recorded yet.</p>
      ) : (
        <div className={styles.listItems}>
          {items.map((item) => {
            if (item.type === 'workout' && item.workout) {
              const workout = item.workout;
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
                              {exercise.weight ? ` - ${formatWeightWithKg(exercise.weight)}` : ''}
                              {exercise.time_seconds ? ` - ${exercise.time_seconds} sec` : ''}
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
            } else if (item.type === 'painScore' && item.painScore) {
              const painScore = item.painScore;
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
            } else if (item.type === 'sleepScore' && item.sleepScore) {
              const sleepScore = item.sleepScore;
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

      {/* Load More Button */}
      {activityItems.length < totalCount && (
        <div className={styles.loadMoreContainer}>
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className={classNames(buttonStyles.secondaryBtn, styles.loadMoreBtn)}
          >
            {isLoadingMore ? 'Loading...' : 'Load Previous Month'}
          </button>
        </div>
      )}

      {/* Floating Action Button */}
      <div className={styles.fabContainer} ref={fabRef}>
        <button
          className={classNames(styles.fab, { [styles.fabOpen]: fabOpen })}
          onClick={() => dispatch({ type: 'SET_FAB_OPEN', payload: !fabOpen })}
          aria-label="Add new item"
          aria-expanded={fabOpen}
        >
          <MdAdd className={styles.fabIcon} />
        </button>
        {fabOpen && (
          <div className={styles.fabMenu}>
            <Link
              to={toWorkoutNewPath()}
              className={styles.fabMenuItem}
              onClick={() => dispatch({ type: 'SET_FAB_OPEN', payload: false })}
            >
              <MdFitnessCenter /> New Workout
            </Link>
            <Link
              to={toPainScoreNewPath()}
              className={styles.fabMenuItem}
              onClick={() => dispatch({ type: 'SET_FAB_OPEN', payload: false })}
            >
              <MdLocalHospital /> New Pain Score
            </Link>
            <Link
              to={toSleepScoreNewPath()}
              className={styles.fabMenuItem}
              onClick={() => dispatch({ type: 'SET_FAB_OPEN', payload: false })}
            >
              <MdHotel /> New Sleep Score
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
