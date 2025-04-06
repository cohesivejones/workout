import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import PainScoreForm from "../components/PainScoreForm";
import { createPainScore, updatePainScore, fetchPainScore } from "../api";
import { PainScore } from "../types";
import { useUserContext } from "../contexts/useUserContext";
import "./PainScorePage.css";

function PainScorePage(): React.ReactElement {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUserContext();
  const [loading, setLoading] = useState<boolean>(!!id);
  const [painScore, setPainScore] = useState<PainScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get the date from query params if available
  const queryParams = new URLSearchParams(location.search);
  const selectedDate = queryParams.get("date");

  useEffect(() => {
    const loadPainScore = async () => {
      if (!id || !user) return;

      try {
        const data = await fetchPainScore(parseInt(id));
        setPainScore(data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load pain score:", err);
        setError("Failed to load pain score. Please try again later.");
        setLoading(false);
      }
    };

    if (id) {
      loadPainScore();
    }
  }, [id, user]);

  const handlePainScoreSubmit = async (
    painScoreData: Omit<PainScore, "id">,
  ) => {
    if (!user) return false;

    try {
      if (id) {
        // Update existing pain score
        await updatePainScore(parseInt(id), painScoreData);
      } else {
        // Create new pain score
        await createPainScore(painScoreData);
      }

      navigate("/");
      return true;
    } catch (err) {
      console.error("Failed to save pain score:", err);
      return false;
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="pain-score-page">
      {error && <div className="error-message">{error}</div>}

      <PainScoreForm
        onSubmit={handlePainScoreSubmit}
        existingPainScore={painScore || undefined}
        userId={user?.id || 0}
        selectedDate={selectedDate || undefined}
      />

      <div className="cancel-button-container">
        <button className="cancel-edit-btn" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default PainScorePage;
