import { useState } from "react";
import { generateWorkout, GenerateWorkoutRequest } from "../api";
import FormContainer from "../components/common/FormContainer";
import styles from "./GenerateWorkoutPage.module.css";

function GenerateWorkoutPage() {
  const [additionalNotes, setAdditionalNotes] = useState<string>("");
  const [generatedWorkout, setGeneratedWorkout] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGeneratedWorkout(null);

    try {
      const request: GenerateWorkoutRequest = {
        additionalNotes: additionalNotes.trim() || undefined,
      };

      const response = await generateWorkout(request);
      setGeneratedWorkout(response.generatedWorkout);
    } catch (err) {
      console.error("Failed to generate workout:", err);
      setError(err instanceof Error ? err.message : "Failed to generate workout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAdditionalNotes("");
    setGeneratedWorkout(null);
    setError(null);
  };

  return (
    <div className={styles.container}>
      <FormContainer
        title="Generate a Workout"
        errorMessage={error}
        asForm={true}
        onSubmit={handleSubmit}
      >
        <div className={styles.formGroup}>
          <label htmlFor="additionalNotes" className={styles.label}>
            Additional Notes (Optional)
          </label>
          <textarea
            id="additionalNotes"
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Add any specific requests, focus areas, or constraints for your workout..."
            className={styles.textarea}
            rows={4}
            disabled={loading}
          />
          <p className={styles.helpText}>
            Tell the AI about any specific goals, injuries to avoid, equipment preferences, or other considerations.
          </p>
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="submit"
            disabled={loading}
            className={`${styles.generateButton} ${loading ? styles.loading : ""}`}
          >
            {loading ? "Generating..." : "Generate Workout"}
          </button>
          
          {(generatedWorkout || error) && (
            <button
              type="button"
              onClick={handleReset}
              className={styles.resetButton}
              disabled={loading}
            >
              Start Over
            </button>
          )}
        </div>
      </FormContainer>

      {generatedWorkout && (
        <div className={styles.resultsContainer}>
          <h3 className={styles.resultsTitle}>Your Generated Workout</h3>
          <div className={styles.workoutContent}>
            <pre className={styles.workoutText}>{generatedWorkout}</pre>
          </div>
          <div className={styles.resultsActions}>
            <button
              onClick={handleReset}
              className={styles.generateAnotherButton}
            >
              Generate Another Workout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GenerateWorkoutPage;
