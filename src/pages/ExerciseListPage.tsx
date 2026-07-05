import { useState, useMemo } from 'react';
import type { ReactElement } from 'react';
import { fetchExercises, updateExercise, suggestExerciseName } from '../api';
import { Exercise } from '../types';
import { useUserContext } from '../contexts/useUserContext';
import { MdFitnessCenter, MdOutlineEdit, MdAutoAwesome } from 'react-icons/md';
import classNames from 'classnames';
import styles from './ExerciseListPage.module.css';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { useAsync } from '../hooks/useAsync';

function ExerciseListPage(): ReactElement {
  const { user } = useUserContext();
  const {
    data: exercisesData,
    loading,
    error: loadError,
    setData: setExercises,
  } = useAsync(() => fetchExercises(), [user], {
    enabled: !!user,
    errorMessage: 'Failed to load exercises. Please try again later.',
  });
  const exercises = useMemo(() => exercisesData ?? [], [exercisesData]);
  const [error, setError] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [newName, setNewName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuggesting, setIsSuggesting] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'none' | 'ascending' | 'descending'>('none');

  const displayError = loadError ?? error;

  const handleEditClick = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setNewName(exercise.name);
  };

  const handleCancelEdit = () => {
    setEditingExercise(null);
    setNewName('');
  };

  const handleSaveEdit = async () => {
    if (!editingExercise || !newName.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const updatedExercise = await updateExercise(editingExercise.id, newName.trim());

      // Update the exercises list with the updated exercise
      setExercises((prevExercises) =>
        (prevExercises ?? []).map((ex) => (ex.id === updatedExercise.id ? updatedExercise : ex))
      );

      // Reset editing state
      setEditingExercise(null);
      setNewName('');
    } catch (err) {
      console.error('Failed to update exercise:', err);
      setError('Failed to update exercise. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestName = async (exercise: Exercise) => {
    try {
      setIsSuggesting(exercise.id);
      setError(null);
      const { suggestions: newSuggestions } = await suggestExerciseName(exercise.id);

      // Show suggestions dropdown for this exercise
      setSuggestions(newSuggestions);
      setShowSuggestions(exercise.id);
    } catch (err) {
      console.error('Failed to suggest exercise name:', err);
      setError('Failed to generate name suggestion. Please try again.');
    } finally {
      setIsSuggesting(null);
    }
  };

  const handleSelectSuggestion = (exercise: Exercise, suggestion: string) => {
    // Enter edit mode with selected suggestion pre-filled
    setEditingExercise(exercise);
    setNewName(suggestion);
    setShowSuggestions(null);
    setSuggestions([]);
  };

  const handleCancelSuggestions = () => {
    setShowSuggestions(null);
    setSuggestions([]);
  };

  const toggleNameSort = () => {
    setSortDirection((prev) => (prev === 'ascending' ? 'descending' : 'ascending'));
  };

  const visibleExercises = useMemo(() => {
    if (sortDirection === 'none') return exercises;
    const sorted = [...exercises].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
    return sortDirection === 'ascending' ? sorted : sorted.reverse();
  }, [exercises, sortDirection]);

  if (loading) {
    return <LoadingState label="Loading..." />;
  }

  return (
    <div className={styles.exerciseListPage}>
      <PageHeader
        title="Exercises"
        subtitle={`Manage your exercise library (${exercises.length} exercises)`}
      />

      {displayError && <ErrorState>{displayError}</ErrorState>}

      <div className={styles.exerciseList}>
        {exercises.length === 0 ? (
          <EmptyState
            icon={<MdFitnessCenter />}
            title="No exercises yet"
            message="Exercises are added automatically as you log them in a workout."
          />
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.exerciseTable} role="table">
              <thead>
                <tr>
                  <th scope="col" aria-sort={sortDirection} className={styles.nameHeader}>
                    <button
                      type="button"
                      onClick={toggleNameSort}
                      className={classNames(styles.sortButton, {
                        [styles.sortActive]: sortDirection !== 'none',
                      })}
                      aria-label="Sort by Exercise Name"
                    >
                      <span>Exercise Name</span>
                      <span aria-hidden="true" className={styles.sortIndicator}>
                        {sortDirection === 'descending' ? '▼' : '▲'}
                      </span>
                    </button>
                  </th>
                  <th scope="col" className={styles.actionsHeader}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleExercises.map((exercise) => (
                  <tr key={exercise.id}>
                    <td className={styles.nameCell}>
                      {editingExercise?.id === exercise.id ? (
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className={styles.exerciseNameInput}
                          placeholder="Exercise name"
                        />
                      ) : (
                        <span className={styles.exerciseName}>
                          <span className={styles.exerciseIcon} aria-hidden="true">
                            <MdFitnessCenter />
                          </span>
                          {exercise.name}
                        </span>
                      )}
                    </td>
                    <td className={styles.actionsCell}>
                      {editingExercise?.id === exercise.id ? (
                        <div className={styles.exerciseEditActions}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={!newName.trim() || isSubmitting}
                          >
                            {isSubmitting ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={isSubmitting}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className={styles.exerciseActions}>
                          {showSuggestions === exercise.id ? (
                            <div className={styles.suggestionsDropdown}>
                              <div className={styles.suggestionsHeader}>
                                <span className={styles.suggestionsTitle}>
                                  Select a suggestion:
                                </span>
                                <button
                                  onClick={handleCancelSuggestions}
                                  className={styles.closeSuggestionsBtn}
                                  aria-label="Close suggestions"
                                >
                                  ×
                                </button>
                              </div>
                              <div className={styles.suggestionsList}>
                                {suggestions.map((suggestion, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => handleSelectSuggestion(exercise, suggestion)}
                                    className={styles.suggestionItem}
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <>
                              <Button
                                variant="tertiary"
                                className={styles.suggestBtn}
                                onClick={() => handleSuggestName(exercise)}
                                aria-label={`Suggest name for ${exercise.name}`}
                                disabled={isSuggesting === exercise.id}
                              >
                                <MdAutoAwesome className={styles.actionIcon} aria-hidden="true" />
                                <span className={styles.actionText}>
                                  {isSuggesting === exercise.id ? 'Suggesting...' : 'Suggest Name'}
                                </span>
                              </Button>
                              <Button
                                variant="tertiary"
                                className={styles.editBtn}
                                onClick={() => handleEditClick(exercise)}
                                aria-label={`Edit ${exercise.name}`}
                              >
                                <MdOutlineEdit className={styles.actionIcon} aria-hidden="true" />
                                <span className={styles.actionText}>Edit</span>
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExerciseListPage;
