import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchWorkout, deleteWorkout } from "../api";
import { Workout } from "../types";
import "./WorkoutShowPage.css";
import { format } from "date-fns";
import classNames from "classnames";
import { toHomePath, toWorkoutEditPath } from "../utils/paths";

const WorkoutShowPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const workoutId = parseInt(id || "0");
  const navigate = useNavigate();

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
        console.error("Failed to load workout:", err);
        setError(err instanceof Error ? err.message : "Failed to load workout");
      } finally {
        setLoading(false);
      }
    };

    loadWorkout();
  }, [workoutId]);

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this workout?")) {
      try {
        setIsDeleting(true);
        await deleteWorkout(workoutId);
        navigate("/");
      } catch (err) {
        console.error("Failed to delete workout:", err);
        alert("Failed to delete workout. Please try again.");
        setIsDeleting(false);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading workout details...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!workout) {
    return <div className="error-message">Workout not found</div>;
  }

  return (
    <div className="workout-show-page">
      <div className="page-header">
        <h2>Workout Details</h2>
        <div className="page-actions">
          <Link to={toHomePath()} className="button secondary">
            Back to List
          </Link>
        </div>
      </div>

      <div
        className={classNames("workout-detail-card", {
          "with-instructor": workout.withInstructor,
        })}
      >
        <div className="workout-detail-header">
          <h3>
            {format(`${workout.date}T12:00:00.000`, "MMM d, yyyy (eeee)")}
          </h3>
          {workout.withInstructor && (
            <div className="instructor-badge">With Instructor</div>
          )}
        </div>

        <div className="workout-detail-content">
          <h4>Exercises:</h4>
          {workout.exercises.length === 0 ? (
            <p>No exercises recorded for this workout.</p>
          ) : (
            <ul className="exercise-detail-list">
              {workout.exercises.map((exercise, index) => (
                <li key={index} className="exercise-detail-item">
                  <div className="exercise-detail-name">{exercise.name}</div>
                  <div className="exercise-detail-stats">
                    <span className="exercise-detail-reps">
                      {exercise.reps} reps
                    </span>
                    {exercise.weight && (
                      <span className="exercise-detail-weight">
                        {exercise.weight} lbs
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="workout-detail-actions">
          <Link to={toWorkoutEditPath(workout)} className="button primary">
            Edit Workout
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="button danger"
          >
            {isDeleting ? "Deleting..." : "Delete Workout"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkoutShowPage;
