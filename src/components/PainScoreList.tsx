import * as React from "react";
import { Link } from "react-router-dom";
import { PainScore } from "../types";
import { deletePainScore } from "../api";
import "./PainScoreList.css";
import { format } from "date-fns";
import { toPainScoreEditPath } from "../utils/paths";

interface PainScoreListProps {
  painScores: PainScore[];
  onPainScoreDeleted: (painScoreId: number) => void;
}

function PainScoreList({
  painScores,
  onPainScoreDeleted,
}: PainScoreListProps): React.ReactElement {
  const [isDeleting, setIsDeleting] = React.useState<number | null>(null);

  const handleDelete = async (painScoreId: number) => {
    if (window.confirm("Are you sure you want to delete this pain score?")) {
      try {
        setIsDeleting(painScoreId);
        await deletePainScore(painScoreId);
        onPainScoreDeleted(painScoreId);
      } catch (err) {
        console.error("Failed to delete pain score:", err);
        alert("Failed to delete pain score. Please try again.");
      } finally {
        setIsDeleting(null);
      }
    }
  };

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

  return (
    <div className="pain-score-list">
      {painScores.length === 0 ? (
        <p>No pain scores recorded yet.</p>
      ) : (
        <div className="pain-scores">
          {painScores.map((painScore) => (
            <div
              key={painScore.id}
              className="pain-score-card"
              style={{ borderLeftColor: getPainScoreColor(painScore.score) }}
            >
              <div className="pain-score-header">
                <h3>
                  {format(
                    `${painScore.date}T12:00:00.000`,
                    "MMM d, yyyy (eeee)"
                  )}
                </h3>
                <div className="pain-score-actions">
                  <Link
                    to={toPainScoreEditPath(painScore)}
                    className="edit-btn"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(painScore.id)}
                    disabled={isDeleting === painScore.id}
                    className="delete-btn"
                  >
                    {isDeleting === painScore.id ? "Deleting..." : "×"}
                  </button>
                </div>
              </div>
              <div className="pain-score-details">
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
          ))}
        </div>
      )}
    </div>
  );
}

export default PainScoreList;
