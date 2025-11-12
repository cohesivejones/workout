import { useState, useEffect, useMemo } from 'react';
import type { ReactElement } from 'react';
import { fetchExercises, updateExercise } from '../api';
import { Exercise } from '../types';
import { useUserContext } from '../contexts/useUserContext';
import classNames from 'classnames';
import styles from './ExerciseListPage.module.css';
import buttonStyles from '../styles/common/buttons.module.css';

function ExerciseListPage(): ReactElement {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [newName, setNewName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [sortDirection, setSortDirection] = useState<'none' | 'ascending' | 'descending'>('none');
  const { user } = useUserContext();

  useEffect(() => {
    const loadExercises = async () => {
      if (!user) return;
      try {
        const exercisesData = await fetchExercises();
        setExercises(exercisesData);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load exercises:', err);
        setError('Failed to load exercises. Please try again later.');
        setLoading(false);
      }
    };
    loadExercises();
  }, [user]);

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
        prevExercises.map((ex) => (ex.id === updatedExercise.id ? updatedExercise : ex))
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
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.exerciseListPage}>
      <div className={styles.pageHeader}>
        <h2>Exercises</h2>
        <p className={styles.subtitle}>
          Manage your exercise library ({exercises.length} exercises)
        </p>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.exerciseList}>
        {exercises.length === 0 ? (
          <p className={styles.noExercises}>
            No exercises found. Add exercises when creating a workout.
          </p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.exerciseTable} role="table">
              <thead>
                <tr>
                  <th scope="col" aria-sort={sortDirection} className={styles.nameHeader}>
                    <button
                      type="button"
                      onClick={toggleNameSort}
                      className={classNames(styles.sortButton, { [styles.sortActive]: sortDirection !== 'none' })}
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
                        <span className={styles.exerciseName}>{exercise.name}</span>
                      )}
                    </td>
                    <td className={styles.actionsCell}>
                      {editingExercise?.id === exercise.id ? (
                        <div className={styles.exerciseEditActions}>
                          <button
                            onClick={handleSaveEdit}
                            disabled={!newName.trim() || isSubmitting}
                            className={classNames(styles.saveBtn, buttonStyles.primaryBtn)}
                          >
                            {isSubmitting ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className={classNames(styles.cancelBtn, buttonStyles.secondaryBtn)}
                            disabled={isSubmitting}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditClick(exercise)}
                          className={classNames(styles.editBtn, buttonStyles.tertiaryBtn)}
                          aria-label={`Edit ${exercise.name}`}
                        >
                          Edit
                        </button>
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
