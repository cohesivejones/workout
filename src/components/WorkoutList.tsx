import * as React from "react";
import { Link } from "react-router-dom";
import { WorkoutListProps } from "../types";
import { deleteWorkout } from "../api";
import "./WorkoutList.css";
import { format } from "date-fns";
import classNames from "classnames";
import { toWorkoutEditPath } from "../utils/paths";

function WorkoutList({
  workouts,
  onWorkoutDeleted,
}: WorkoutListProps): React.ReactElement {
  const [isDeleting, setIsDeleting] = React.useState<number | null>(null);

  const handleDelete = async (workoutId: number) => {
    if (window.confirm("Are you sure you want to delete this workout?")) {
      try {
        setIsDeleting(workoutId);
        await deleteWorkout(workoutId);
        onWorkoutDeleted(workoutId);
      } catch (err) {
        console.error("Failed to delete workout:", err);
        alert("Failed to delete workout. Please try again.");
      } finally {
        setIsDeleting(null);
      }
    }
  };

  return (
    <div className="workout-list">
      {workouts.length === 0 ? (
        <p>No workouts yet. Add your first workout!</p>
      ) : (
        <div className="workouts">
          {workouts.map((workout) => (
            <div
              key={workout.id}
              className={classNames("workout-card", {
                "with-instructor": workout.withInstructor,
              })}
            >
              <div className="workout-header">
                <h3>
                  {format(`${workout.date}T12:00:00.000`, "MMM d, yyyy (eeee)")}
                </h3>
                <div className="workout-actions">
                  <Link to={toWorkoutEditPath(workout)} className="edit-btn">
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(workout.id)}
                    disabled={isDeleting === workout.id}
                    className="delete-btn"
                  >
                    {isDeleting === workout.id ? "Deleting..." : "×"}
                  </button>
                </div>
              </div>
              <ul>
                {(workout.exercises || [])
                  .filter((ex) => ex)
                  .map((exercise, index) => (
                    <li key={index}>
                      {exercise.name} - {exercise.reps} reps
                      {exercise.weight ? ` - ${exercise.weight} lbs` : ""}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WorkoutList;
