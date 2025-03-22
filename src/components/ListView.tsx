import { Link } from "react-router-dom";
import { toPainScoreEditPath } from "../utils/paths";
import WorkoutList from "./WorkoutList";
import { PainScore, Workout } from "../types";

interface ListViewProps {
  painScores: PainScore[];
  handlePainScoreDelete: (painScoreId: number) => void;
  workouts: Workout[];
  handleWorkoutDeleted: (workoutId: number) => void;
}

export const ListView = ({
  painScores,
  handlePainScoreDelete,
  workouts,
  handleWorkoutDeleted,
}: ListViewProps) => {
  return (
    <div>
      <div className="pain-scores-list">
        <h3>Pain Scores</h3>
        {painScores.length === 0 ? (
          <p>No pain scores recorded yet.</p>
        ) : (
          <div className="pain-score-cards">
            {painScores.map((painScore) => (
              <div key={painScore.id} className="pain-score-card">
                <div className="pain-score-header">
                  <h4>{new Date(painScore.date).toLocaleDateString()}</h4>
                  <div className="pain-score-value">
                    Pain Level: <strong>{painScore.score}</strong>
                  </div>
                </div>
                {painScore.notes && (
                  <div className="pain-score-notes">{painScore.notes}</div>
                )}
                <div className="pain-score-actions">
                  <Link
                    to={toPainScoreEditPath(painScore)}
                    className="edit-btn"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handlePainScoreDelete(painScore.id)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <WorkoutList
        workouts={workouts}
        onWorkoutDeleted={handleWorkoutDeleted}
      />
    </div>
  );
};
