import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { PainScore } from "../types";
import styles from "./PainScoreForm.module.css";
import classNames from "classnames";

interface PainScoreFormProps {
  onSubmit: (painScore: Omit<PainScore, "id">) => Promise<boolean>;
  existingPainScore?: PainScore;
  userId: number;
  selectedDate?: string;
  onCancel?: () => void;
}

interface FormValues {
  date: string;
  score: string;
  notes: string;
}

// Pain score descriptions
const painScoreDescriptions = [
  "0: Pain free",
  "1: Pain is very mild, barely noticeable. Most of the time you don't think about it",
  "2: Minor pain. Annoying and may have occasional stronger twinges",
  "3: Pain is noticeable and distracting, however, you can get used to it and adapt",
  "4: Moderate pain. If deeply involved in an activity, it can be ignored for a period of time",
  "5: Moderately strong pain. Can't be ignored for more than a few minutes",
  "6: Moderately strong pain that interferes with normal daily activities. Difficulty concentrating",
  "7: Severe pain that dominates your senses and limits your ability to perform normal activities",
  "8: Intense pain. Physical activity is severely limited. Conversing requires great effort",
  "9: Excruciating pain. Unable to converse. Crying out and/or moaning uncontrollably",
  "10: Unspeakable pain. Bedridden and possibly delirious. Very few people will ever experience this level of pain",
];

function PainScoreForm({
  onSubmit,
  existingPainScore,
  userId,
  selectedDate,
  onCancel,
}: PainScoreFormProps): React.ReactElement {
  const [selectedScore, setSelectedScore] = React.useState<number | null>(
    existingPainScore?.score ?? null,
  );

  // Use react-hook-form
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    defaultValues: {
      date: existingPainScore
        ? new Date(existingPainScore.date).toISOString().split("T")[0]
        : selectedDate || new Date().toISOString().split("T")[0],
      score: existingPainScore?.score?.toString() || "",
      notes: existingPainScore?.notes || "",
    },
  });

  const watchScore = watch("score");

  React.useEffect(() => {
    if (watchScore) {
      setSelectedScore(parseInt(watchScore));
    } else {
      setSelectedScore(null);
    }
  }, [watchScore]);

  // Form submission handler
  const onFormSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!data.score) return;

    try {
      const success = await onSubmit({
        userId,
        date: data.date,
        score: parseInt(data.score),
        notes: data.notes || null,
      });

      if (!success) {
        setError("root", {
          type: "manual",
          message: "Failed to save pain score. Please try again.",
        });
      }
    } catch (err) {
      setError("root", {
        type: "manual",
        message: err instanceof Error ? err.message : "An error occurred",
      });
    }
  };

  return (
    <div className={styles.painScoreForm}>
      <h2>{existingPainScore ? "Edit Pain Score" : "Add Pain Score"}</h2>
      {errors.root && (
        <div className={styles.errorMessage}>{errors.root.message}</div>
      )}
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <div className={styles.dateInput}>
          <label htmlFor="pain-score-date">Date:</label>
          <input
            type="date"
            id="pain-score-date"
            {...register("date", { required: "Date is required" })}
          />
          {errors.date && (
            <span className={styles.errorMessage}>{errors.date.message}</span>
          )}
        </div>

        <div className={styles.painScoreInput}>
          <label htmlFor="pain-score">Pain Score (0-10):</label>
          <select
            id="pain-score"
            className={styles.painScoreSelect}
            {...register("score", { required: "Pain score is required" })}
          >
            <option value="">Select pain score</option>
            {painScoreDescriptions.map((description, index) => (
              <option key={index} value={index}>
                {description}
              </option>
            ))}
          </select>
          {errors.score && (
            <span className={styles.errorMessage}>{errors.score.message}</span>
          )}
        </div>

        <div className={styles.notesInput}>
          <label htmlFor="pain-score-notes">Notes (optional):</label>
          <textarea
            id="pain-score-notes"
            {...register("notes")}
            placeholder="Add any additional notes about your pain level"
          />
        </div>

        <div className={styles.formButtons}>
          <button
            type="submit"
            disabled={isSubmitting}
            className={classNames(styles.savePainScoreBtn, styles.primaryBtn)}
            title={existingPainScore ? "Update pain score" : "Save pain score"}
          >
            {isSubmitting ? (
              "Saving..."
            ) : (
              <>{existingPainScore ? "Update Pain Score" : "Save Pain Score"}</>
            )}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={classNames(styles.cancelBtn, styles.secondaryBtn)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className={styles.painScoreLegend}>
        <h3>Pain Score Legend:</h3>
        <ul>
          {painScoreDescriptions.map((description, index) => (
            <li
              key={index}
              className={classNames({
                [styles.selected]: selectedScore === index,
              })}
            >
              {description}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default PainScoreForm;
