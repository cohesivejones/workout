import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import SleepScoreForm from "../components/SleepScoreForm";
import { createSleepScore, updateSleepScore, fetchSleepScore } from "../api";
import { SleepScore } from "../types";
import { useUserContext } from "../contexts/useUserContext";
import styles from "./SleepScorePage.module.css";

function SleepScorePage(): React.ReactElement {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUserContext();
  const [loading, setLoading] = useState<boolean>(!!id);
  const [sleepScore, setSleepScore] = useState<SleepScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get the date from query params if available
  const queryParams = new URLSearchParams(location.search);
  const selectedDate = queryParams.get("date");

  useEffect(() => {
    const loadSleepScore = async () => {
      if (!id || !user) return;

      try {
        const data = await fetchSleepScore(parseInt(id));
        setSleepScore(data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load sleep score:", err);
        setError("Failed to load sleep score. Please try again later.");
        setLoading(false);
      }
    };

    if (id) {
      loadSleepScore();
    }
  }, [id, user]);

  const handleSleepScoreSubmit = async (
    sleepScoreData: Omit<SleepScore, "id">,
  ) => {
    if (!user) return false;

    try {
      if (id) {
        // Update existing sleep score
        await updateSleepScore(parseInt(id), sleepScoreData);
      } else {
        // Create new sleep score
        await createSleepScore(sleepScoreData);
      }

      navigate("/");
      return true;
    } catch (err) {
      console.error("Failed to save sleep score:", err);
      return false;
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.sleepScorePage}>
      {error && <div className={styles.errorMessage}>{error}</div>}

      <SleepScoreForm
        onSubmit={handleSleepScoreSubmit}
        existingSleepScore={sleepScore || undefined}
        userId={user?.id || 0}
        selectedDate={selectedDate || undefined}
        onCancel={handleCancel}
      />
    </div>
  );
}

export default SleepScorePage;
