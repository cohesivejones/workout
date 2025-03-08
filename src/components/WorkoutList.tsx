import * as React from "react";
import { Link } from "react-router-dom";
import { WorkoutListProps } from "../types";
import { deleteWorkout } from "../api";

function WorkoutList({
  workouts,
  onWorkoutDeleted,
}: WorkoutListProps): React.ReactElement {
  const [isDeleting, setIsDeleting] = React.useState<number | null>(null);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const day = days[date.getDay()];
    const formattedDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return `${formattedDate} (${day})`;
  };

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
              className={`workout-card ${
                workout.withInstructor ? "with-instructor" : ""
              }`}
            >
              <div className="workout-header">
                <h3>{formatDate(workout.date)}</h3>
                <div className="workout-actions">
                  <Link to={`/edit/${workout.id}`} className="edit-btn">
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
