import React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { PainScore, Workout } from "../types";
import {
  toPainScoreNewPath,
  toPainScoreEditPath,
  toWorkoutEditPath,
  toWorkoutNewPath,
} from "../utils/paths";
import { deletePainScore, deleteWorkout } from "../api";
import classNames from "classnames";
import "./ListView.css";

interface ListViewProps {
  painScores: PainScore[];
  handlePainScoreDelete: (painScoreId: number) => void;
  workouts: Workout[];
  handleWorkoutDeleted: (workoutId: number) => void;
}

type ListItem =
  | { type: "workout"; data: Workout }
  | { type: "painScore"; data: PainScore };

export const ListView = ({
  painScores,
  handlePainScoreDelete,
  workouts,
  handleWorkoutDeleted,
}: ListViewProps) => {
  const [isDeleting, setIsDeleting] = React.useState<{
    type: string;
    id: number;
  } | null>(null);

  // Combine workouts and pain scores into a single array
  const items: ListItem[] = [
    ...workouts.map((workout) => ({ type: "workout" as const, data: workout })),
    ...painScores.map((painScore) => ({
      type: "painScore" as const,
      data: painScore,
    })),
  ];

  // Sort by date in descending order (newest first)
  items.sort((a, b) => {
    const dateA = new Date(a.type === "workout" ? a.data.date : a.data.date);
    const dateB = new Date(b.type === "workout" ? b.data.date : b.data.date);
    return dateB.getTime() - dateA.getTime();
  });

  // Function to get color based on pain score
  const getPainScoreColor = (score: number): string => {
    if (score === 0) return "#4caf50"; // Green for no pain
    if (score <= 3) return "#8bc34a"; // Light green for mild pain
    if (score <= 5) return "#ffc107"; // Yellow for moderate pain
    if (score <= 7) return "#ff9800"; // Orange for severe pain
    return "#f44336"; // Red for extreme pain
  };

  // Function to get pain score description
  const getPainScoreDescription = (score: number): string => {
    const descriptions = [
      "Pain free",
      "Very mild pain, barely noticeable",
      "Minor pain with occasional stronger twinges",
      "Noticeable and distracting pain",
      "Moderate pain, can be ignored temporarily",
      "Moderately strong pain, can't be ignored for long",
      "Moderately strong pain interfering with daily activities",
      "Severe pain limiting normal activities",
      "Intense pain, physical activity severely limited",
      "Excruciating pain, unable to converse normally",
      "Unspeakable pain, bedridden",
    ];
    return descriptions[score] || "";
  };

  const handleDeleteWorkout = async (workoutId: number) => {
    if (window.confirm("Are you sure you want to delete this workout?")) {
      try {
        setIsDeleting({ type: "workout", id: workoutId });
        await deleteWorkout(workoutId);
        handleWorkoutDeleted(workoutId);
      } catch (err) {
        console.error("Failed to delete workout:", err);
        alert("Failed to delete workout. Please try again.");
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleDeletePainScore = async (painScoreId: number) => {
    if (window.confirm("Are you sure you want to delete this pain score?")) {
      try {
        setIsDeleting({ type: "painScore", id: painScoreId });
        await deletePainScore(painScoreId);
        handlePainScoreDelete(painScoreId);
      } catch (err) {
        console.error("Failed to delete pain score:", err);
        alert("Failed to delete pain score. Please try again.");
      } finally {
        setIsDeleting(null);
      }
    }
  };

  return (
    <div className="chronological-list">
      <div className="section-header">
        <h3>Activity Timeline</h3>
        <div className="action-buttons">
          <Link to={toWorkoutNewPath()} className="add-btn workout-btn">
            New Workout
          </Link>
          <Link to={toPainScoreNewPath()} className="add-btn pain-score-btn">
            New Pain Score
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <p>No workouts or pain scores recorded yet.</p>
      ) : (
        <div className="list-items">
          {items.map((item) => {
            if (item.type === "workout") {
              const workout = item.data;
              return (
                <div
                  key={`workout-${workout.id}`}
                  className={classNames("list-card workout-card", {
                    "with-instructor": workout.withInstructor,
                  })}
                >
                  <div className="list-card-header">
                    <h3>
                      {format(
                        `${workout.date}T12:00:00.000`,
                        "MMM d, yyyy (eeee)"
                      )}
                    </h3>
                    <div className="list-card-type">Workout</div>
                    <div className="list-card-actions">
                      <Link
                        to={toWorkoutEditPath(workout)}
                        className="edit-btn"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteWorkout(workout.id)}
                        disabled={
                          isDeleting?.type === "workout" &&
                          isDeleting.id === workout.id
                        }
                        className="delete-btn"
                      >
                        {isDeleting?.type === "workout" &&
                        isDeleting.id === workout.id
                          ? "..."
                          : "×"}
                      </button>
                    </div>
                  </div>
                  <div className="list-card-content">
                    <ul>
                      {(workout.exercises || [])
                        .filter((ex) => ex)
                        .map((exercise, idx) => (
                          <li key={idx}>
                            {exercise.name} - {exercise.reps} reps
                            {exercise.weight ? ` - ${exercise.weight} lbs` : ""}
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              );
            } else {
              const painScore = item.data;
              return (
                <div
                  key={`pain-score-${painScore.id}`}
                  className="list-card pain-score-card"
                  style={{
                    borderLeftColor: getPainScoreColor(painScore.score),
                  }}
                >
                  <div className="list-card-header">
                    <h3>
                      {format(
                        `${painScore.date}T12:00:00.000`,
                        "MMM d, yyyy (eeee)"
                      )}
                    </h3>
                    <div className="list-card-type">Pain Score</div>
                    <div className="list-card-actions">
                      <Link
                        to={toPainScoreEditPath(painScore)}
                        className="edit-btn"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeletePainScore(painScore.id)}
                        disabled={
                          isDeleting?.type === "painScore" &&
                          isDeleting.id === painScore.id
                        }
                        className="delete-btn"
                      >
                        {isDeleting?.type === "painScore" &&
                        isDeleting.id === painScore.id
                          ? "..."
                          : "×"}
                      </button>
                    </div>
                  </div>
                  <div className="list-card-content">
                    <div className="pain-score-level">
                      <strong>Pain Level: {painScore.score}</strong> -{" "}
                      {getPainScoreDescription(painScore.score)}
                    </div>
                    {painScore.notes && (
                      <div className="pain-score-notes">
                        <strong>Notes:</strong> {painScore.notes}
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
