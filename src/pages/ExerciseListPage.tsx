import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { fetchExercises, updateExercise } from "../api";
import { Exercise } from "../types";
import { useUserContext } from "../contexts/useUserContext";
import "./ExerciseListPage.css";

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
      const updatedExercise = await updateExercise(editingExercise.id, newName.trim());
      
      // Update the exercises list with the updated exercise
      setExercises(prevExercises => 
        prevExercises.map(ex => 
          ex.id === updatedExercise.id ? updatedExercise : ex
        )
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
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="exercise-list-page">
      <div className="page-header">
        <h2>Exercises</h2>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="exercise-list">
        {exercises.length === 0 ? (
          <p className="no-exercises">No exercises found. Add exercises when creating a workout.</p>
        ) : (
          <div className="exercise-cards">
            {exercises.map((exercise) => (
              <div key={exercise.id} className="exercise-card">
                {editingExercise?.id === exercise.id ? (
                  <div className="exercise-edit-form">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="exercise-name-input"
                      placeholder="Exercise name"
                    />
                    <div className="exercise-edit-actions">
                      <button 
                        onClick={handleSaveEdit} 
                        disabled={!newName.trim() || isSubmitting}
                        className="save-btn"
                      >
                        {isSubmitting ? "Saving..." : "Save"}
                      </button>
                      <button 
                        onClick={handleCancelEdit}
                        className="cancel-btn"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="exercise-name">{exercise.name}</div>
                    <div className="exercise-actions">
                      <button 
                        onClick={() => handleEditClick(exercise)}
                        className="edit-btn"
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
