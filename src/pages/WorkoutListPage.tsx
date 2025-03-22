import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import WorkoutList from "../components/WorkoutList";
import CalendarView from "../components/CalendarView";
import { fetchWorkouts, fetchPainScores, deletePainScore } from "../api";
import { Workout, PainScore } from "../types";
import classNames from "classnames";
import "./WorkoutListPage.css";
import { useUserContext } from "../contexts/useUserContext";
import {
  toWorkoutNewPath,
  toPainScoreNewPath,
  toPainScoreEditPath,
} from "../utils/paths";

function WorkoutListPage(): ReactElement {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [painScores, setPainScores] = useState<PainScore[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const { user } = useUserContext();

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const [workoutsData, painScoresData] = await Promise.all([
          fetchWorkouts(user.id),
          fetchPainScores(user.id),
        ]);
        setWorkouts(workoutsData);
        setPainScores(painScoresData);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("Failed to load data. Please try again later.");
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const handleWorkoutDeleted = (workoutId: number) => {
    setWorkouts((prevWorkouts) =>
      prevWorkouts.filter((w) => w.id !== workoutId)
    );
  };

  const handlePainScoreDelete = async (painScoreId: number) => {
    if (window.confirm("Are you sure you want to delete this pain score?")) {
      try {
        await deletePainScore(painScoreId);
        setPainScores((prev) => prev.filter((ps) => ps.id !== painScoreId));
      } catch (err) {
        console.error("Failed to delete pain score:", err);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>{user?.name} Workouts</h2>
        <div className="page-actions">
          <Link to={toWorkoutNewPath()} className="button">
            New Workout
          </Link>
          <Link to={toPainScoreNewPath()} className="button">
            New Pain Score
          </Link>
          <div className="view-toggle">
            <button
              className={classNames({
                active: viewMode === "calendar",
              })}
              onClick={() => setViewMode("calendar")}
            >
              Calendar
            </button>
            <button
              className={classNames({
                active: viewMode === "list",
              })}
              onClick={() => setViewMode("list")}
            >
              List
            </button>
          </div>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}

      {viewMode === "calendar" ? (
        <CalendarView workouts={workouts} painScores={painScores} />
      ) : (
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
      )}
    </div>
  );
}

export default WorkoutListPage;
