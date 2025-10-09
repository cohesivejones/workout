import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchWorkout, deleteWorkout } from "../api";
import { Workout } from "../types";
import styles from "./WorkoutShowPage.module.css";
import buttonStyles from "../styles/common/buttons.module.css";
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
          <Link
            to={toHomePath()}
            className={classNames(styles.button, buttonStyles.tertiaryBtn)}
            style={{ display: 'inline-block', textAlign: 'center' }}
          >
            Back to List
          </Link>
        </div>
      </div>

      <div
        className={classNames(styles.workoutDetailCard, {
          [styles.withInstructor]: workout.withInstructor,
        })}
      >
        <div className={styles.workoutDetailHeader}>
          <h3>
            {format(`${workout.date}T12:00:00.000`, "MMM d, yyyy (eeee)")}
          </h3>
          {workout.withInstructor && (
            <div className={styles.instructorBadge}>With Instructor</div>
          )}
        </div>

        <div className={styles.workoutDetailContent}>
          <h4>Exercises:</h4>
          {workout.exercises.length === 0 ? (
            <p>No exercises recorded for this workout.</p>
          ) : (
            <ul className={styles.exerciseDetailList}>
              {workout.exercises.map((exercise, index) => (
                <li key={index} className={styles.exerciseDetailItem}>
                  <div className={styles.exerciseDetailName}>
                    {exercise.name}
                  </div>
                  <div className={styles.exerciseDetailStats}>
                    <span className={styles.exerciseDetailReps}>
                      {exercise.reps} reps
                    </span>
                    {exercise.weight && (
                      <span className={styles.exerciseDetailWeight}>
                        {exercise.weight} lbs
                      </span>
                    )}
                    {exercise.time_minutes && (
                      <span className={styles.exerciseDetailTime}>
                        {exercise.time_minutes} min
                      </span>
                    )}
                    {(exercise.new_reps || exercise.new_weight || exercise.new_time) && (
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
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.workoutDetailActions}>
          <Link
            to={toWorkoutEditPath(workout)}
            className={classNames(styles.button, buttonStyles.primaryBtn)}
            style={{ display: 'inline-block', textAlign: 'center' }}
          >
            Edit Workout
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={classNames(styles.button, buttonStyles.secondaryBtn)}
          >
            {isDeleting ? "Deleting..." : "Delete Workout"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkoutShowPage;
