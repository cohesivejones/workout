import React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { MdOutlineEdit } from "react-icons/md";
import { PainScore, Workout } from "../types";
import {
  toPainScoreNewPath,
  toPainScoreEditPath,
  toWorkoutEditPath,
  toWorkoutNewPath,
} from "../utils/paths";
import { deletePainScore, deleteWorkout } from "../api";
import classNames from "classnames";
import styles from "./ListView.module.css";
import buttonStyles from "../styles/common/buttons.module.css";

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
    <div className={styles.chronologicalList}>
      <div className={styles.sectionHeader}>
        <div className={styles.actionButtons}>
          <Link
            to={toWorkoutNewPath()}
            className={classNames(styles.addBtn, buttonStyles.primaryBtn)}
          >
            New Workout
          </Link>
          <Link
            to={toPainScoreNewPath()}
            className={classNames(styles.addBtn, buttonStyles.secondaryBtn)}
          >
            New Pain Score
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <p>No workouts or pain scores recorded yet.</p>
      ) : (
        <div className={styles.listItems}>
          {items.map((item) => {
            if (item.type === "workout") {
              const workout = item.data;
              return (
                <div
                  key={`workout-${workout.id}`}
                  className={classNames(styles.listCard, styles.workoutCard, {
                    [styles.withInstructor]: workout.withInstructor,
                  })}
                >
                  <div className={styles.listCardHeader}>
                    <div className={styles.listCardType}>Workout</div>
                    <h3>
                      {format(
                        `${workout.date}T12:00:00.000`,
                        "MMM d, yyyy (eeee)"
                      )}
                    </h3>
                    <div className={styles.listCardActions}>
                      <Link
                        to={toWorkoutEditPath(workout)}
                        className={classNames(
                          styles.editBtn,
                          buttonStyles.tertiaryIconBtn
                        )}
                        title="Edit workout"
                      >
                        <MdOutlineEdit />
                      </Link>
                      <button
                        onClick={() => handleDeleteWorkout(workout.id)}
                        disabled={
                          isDeleting?.type === "workout" &&
                          isDeleting.id === workout.id
                        }
                        className={classNames(
                          styles.deleteBtn,
                          buttonStyles.secondaryIconBtn
                        )}
                        title="Delete workout"
                      >
                        {isDeleting?.type === "workout" &&
                        isDeleting.id === workout.id
                          ? "..."
                          : "x"}
                      </button>
                    </div>
                  </div>
                  <div className={styles.listCardContent}>
                    <div className={styles.exercisesList}>
                      {(workout.exercises || [])
                        .filter((ex) => ex)
                        .map((exercise, idx) => (
                          <div key={idx} className={styles.exerciseItem}>
                            <span className={styles.exerciseName}>
                              {exercise.name}
                            </span>
                            <span className={styles.exerciseDetails}>
                              {exercise.reps} reps
                              {exercise.weight
                                ? ` - ${exercise.weight} lbs`
                                : ""}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              );
            } else {
              const painScore = item.data;
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
                    <h3>
                      {format(
                        `${painScore.date}T12:00:00.000`,
                        "MMM d, yyyy (eeee)"
                      )}
                    </h3>
                    <div className={styles.listCardActions}>
                      <Link
                        to={toPainScoreEditPath(painScore)}
                        className={classNames(
                          styles.editBtn,
                          buttonStyles.tertiaryIconBtn
                        )}
                        title="Edit pain score"
                      >
                        <MdOutlineEdit />
                      </Link>
                      <button
                        onClick={() => handleDeletePainScore(painScore.id)}
                        disabled={
                          isDeleting?.type === "painScore" &&
                          isDeleting.id === painScore.id
                        }
                        className={classNames(
                          styles.deleteBtn,
                          buttonStyles.secondaryIconBtn
                        )}
                        title="Delete pain score"
                      >
                        {isDeleting?.type === "painScore" &&
                        isDeleting.id === painScore.id
                          ? "..."
                          : "x"}
                      </button>
                    </div>
                  </div>
                  <div className={styles.listCardContent}>
                    <div className={styles.painScoreInfo}>
                      <span className={styles.painScoreLabel}>Pain Level:</span>
                      <span className={styles.painScoreValue}>
                        {painScore.score} -{" "}
                        {getPainScoreDescription(painScore.score)}
                      </span>
                    </div>
                    {painScore.notes && (
                      <div className={styles.painScoreInfo}>
                        <span className={styles.painScoreLabel}>Notes:</span>
                        <span className={styles.painScoreValue}>
                          {painScore.notes}
                        </span>
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
