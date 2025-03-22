import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import WorkoutList from "../components/WorkoutList";
import CalendarView from "../components/CalendarView";
import PainScoreForm from "../components/PainScoreForm";
import { fetchWorkouts, fetchPainScores, createPainScore, updatePainScore, deletePainScore } from "../api";
import { Workout, PainScore } from "../types";
import classNames from "classnames";
import "./WorkoutListPage.css";
import { useUserContext } from "../contexts/useUserContext";
import { toWorkoutNewPath } from "../utils/paths";

function WorkoutListPage(): ReactElement {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [painScores, setPainScores] = useState<PainScore[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingPainScore, setEditingPainScore] = useState<PainScore | null>(null);
  const { user } = useUserContext();

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const [workoutsData, painScoresData] = await Promise.all([
          fetchWorkouts(user.id),
          fetchPainScores(user.id)
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

  const handlePainScoreSubmit = async (painScoreData: Omit<PainScore, "id">) => {
    if (!user) return false;
    
    try {
      // If editing an existing pain score
      if (editingPainScore) {
        const updatedPainScore = await updatePainScore(
          editingPainScore.id,
          painScoreData
        );
        
        setPainScores((prev) =>
          prev.map((ps) => (ps.id === updatedPainScore.id ? updatedPainScore : ps))
        );
        
        setEditingPainScore(null);
      } else {
        // Creating a new pain score
        const newPainScore = await createPainScore(painScoreData);
        setPainScores((prev) => [...prev, newPainScore]);
      }
      
      setSelectedDate(null);
      return true;
    } catch (err) {
      console.error("Failed to save pain score:", err);
      return false;
    }
  };

  const handlePainScoreDelete = async (painScoreId: number) => {
    if (window.confirm("Are you sure you want to delete this pain score?")) {
      try {
        await deletePainScore(painScoreId);
        setPainScores((prev) => prev.filter((ps) => ps.id !== painScoreId));
        setEditingPainScore(null);
      } catch (err) {
        console.error("Failed to delete pain score:", err);
      }
    }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setEditingPainScore(null);
  };

  const handleEditPainScore = (painScore: PainScore) => {
    setEditingPainScore(painScore);
    setSelectedDate(null);
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
            Add New Workout
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

      <div className="pain-score-section">
        {editingPainScore ? (
          <div>
            <PainScoreForm
              onSubmit={handlePainScoreSubmit}
              existingPainScore={editingPainScore}
              userId={user?.id || 0}
            />
            <button 
              className="cancel-edit-btn" 
              onClick={() => setEditingPainScore(null)}
            >
              Cancel Edit
            </button>
          </div>
        ) : selectedDate ? (
          <div>
            <PainScoreForm
              onSubmit={handlePainScoreSubmit}
              userId={user?.id || 0}
              selectedDate={selectedDate}
            />
            <button 
              className="cancel-edit-btn" 
              onClick={() => setSelectedDate(null)}
            >
              Cancel
            </button>
          </div>
        ) : null}
      </div>

      {viewMode === "calendar" ? (
        <CalendarView 
          workouts={workouts} 
          painScores={painScores}
          onDateSelect={handleDateSelect}
          onEditPainScore={handleEditPainScore}
          onDeletePainScore={handlePainScoreDelete}
        />
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
                      <button
                        onClick={() => handleEditPainScore(painScore)}
                        className="edit-btn"
                      >
                        Edit
                      </button>
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
            {!selectedDate && !editingPainScore && (
              <button
                className="add-pain-score-btn"
                onClick={() => handleDateSelect(new Date().toISOString().split("T")[0])}
              >
                Add Pain Score
              </button>
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
