import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import CalendarView from "../components/CalendarView";
import { fetchWorkouts, fetchPainScores, deletePainScore } from "../api";
import { Workout, PainScore } from "../types";
import classNames from "classnames";
import "./WorkoutListPage.css";
import { useUserContext } from "../contexts/useUserContext";
import { toWorkoutNewPath, toPainScoreNewPath } from "../utils/paths";
import { ListView } from "../components/ListView";

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
        <CalendarView 
          workouts={workouts} 
          painScores={painScores} 
          onDeletePainScore={handlePainScoreDelete}
        />
      ) : (
        <ListView
          workouts={workouts}
          painScores={painScores}
          handleWorkoutDeleted={handleWorkoutDeleted}
          handlePainScoreDelete={handlePainScoreDelete}
        />
      )}
    </div>
  );
}

export default WorkoutListPage;
