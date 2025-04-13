import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { fetchExercises, updateExercise } from "../api";
import { Exercise } from "../types";
import { useUserContext } from "../contexts/useUserContext";
import classNames from "classnames";
import styles from "./ExerciseListPage.module.css";
import buttonStyles from "../styles/common/buttons.module.css";

function ExerciseListPage(): ReactElement {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [newName, setNewName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { user } = useUserContext();

  useEffect(() => {
    const loadExercises = async () => {
      if (!user) return;
      try {
        const exercisesData = await fetchExercises(user.id);
        setExercises(exercisesData);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load exercises:", err);
        setError("Failed to load exercises. Please try again later.");
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
    setNewName("");
  };

  const handleSaveEdit = async () => {
    if (!editingExercise || !newName.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const updatedExercise = await updateExercise(
        editingExercise.id,
        newName.trim(),
      );

      // Update the exercises list with the updated exercise
      setExercises((prevExercises) =>
        prevExercises.map((ex) =>
          ex.id === updatedExercise.id ? updatedExercise : ex,
        ),
      );

      // Reset editing state
      setEditingExercise(null);
      setNewName("");
    } catch (err) {
      console.error("Failed to update exercise:", err);
      setError("Failed to update exercise. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.exerciseListPage}>
      <div className={styles.pageHeader}>
        <h2>Exercises</h2>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.exerciseList}>
        {exercises.length === 0 ? (
          <p className={styles.noExercises}>
            No exercises found. Add exercises when creating a workout.
          </p>
        ) : (
          <div className={styles.exerciseCards}>
            {exercises.map((exercise) => (
              <div key={exercise.id} className={styles.exerciseCard}>
                {editingExercise?.id === exercise.id ? (
                  <div className={styles.exerciseEditForm}>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className={styles.exerciseNameInput}
                      placeholder="Exercise name"
                    />
                    <div className={styles.exerciseEditActions}>
                      <button
                        onClick={handleSaveEdit}
                        disabled={!newName.trim() || isSubmitting}
                        className={classNames(
                          styles.saveBtn,
                          buttonStyles.primaryBtn,
                        )}
                      >
                        {isSubmitting ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className={classNames(
                          styles.cancelBtn,
                          buttonStyles.secondaryBtn,
                        )}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.exerciseName}>{exercise.name}</div>
                    <div className={styles.exerciseActions}>
                      <button
                        onClick={() => handleEditClick(exercise)}
                        className={classNames(
                          styles.editBtn,
                          buttonStyles.tertiaryBtn,
                        )}
                      >
                        Edit
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExerciseListPage;
