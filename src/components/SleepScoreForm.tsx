import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { SleepScore } from "../types";
import styles from "./SleepScoreForm.module.css";
import classNames from "classnames";
import buttonStyles from "../styles/common/buttons.module.css";
import SleepScaleSelector from "./SleepScaleSelector";
import FormContainer from "./common/FormContainer";

interface SleepScoreFormProps {
  onSubmit: (sleepScore: Omit<SleepScore, "id">) => Promise<boolean>;
  existingSleepScore?: SleepScore;
  selectedDate?: string;
  onCancel?: () => void;
}

interface FormValues {
  date: string;
  score: string;
  notes: string;
}

function SleepScoreForm({
  onSubmit,
  existingSleepScore,
  selectedDate,
  onCancel,
}: SleepScoreFormProps): React.ReactElement {
  const [selectedScore, setSelectedScore] = React.useState<number | null>(
    existingSleepScore?.score ?? null
  );

  // Use react-hook-form
  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    defaultValues: {
      date: existingSleepScore
        ? new Date(existingSleepScore.date).toISOString().split("T")[0]
        : selectedDate || new Date().toISOString().split("T")[0],
      score: existingSleepScore?.score?.toString() || "",
      notes: existingSleepScore?.notes || "",
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
        date: data.date,
        score: parseInt(data.score),
        notes: data.notes || null,
      });

      if (!success) {
        setError("root", {
          type: "manual",
          message: "Failed to save sleep score. Please try again.",
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
    <FormContainer
      title={existingSleepScore ? "Edit Sleep Score" : "Add Sleep Score"}
      errorMessage={errors.root?.message}
      onSubmit={handleSubmit(onFormSubmit)}
      className={styles.sleepScoreForm}
    >
      <div className={styles.dateInput}>
        <label htmlFor="sleep-score-date">Date:</label>
        <input
          type="date"
          id="sleep-score-date"
          {...register("date", { required: "Date is required" })}
        />
        {errors.date && <span className={styles.errorMessage}>{errors.date.message}</span>}
      </div>

      <div className={styles.sleepScoreInput}>
        <label htmlFor="sleep-score">Sleep Score (1-5):</label>
        <SleepScaleSelector
          name="score"
          control={control}
          value={selectedScore}
          onChange={(value) => {
            setValue("score", value.toString());
          }}
          error={errors.score?.message}
        />
      </div>

      <div className={styles.notesInput}>
        <label htmlFor="sleep-score-notes">Notes (optional):</label>
        <textarea
          id="sleep-score-notes"
          {...register("notes")}
          placeholder="Add any additional notes about your sleep quality"
        />
      </div>

      <div className={styles.formButtons}>
        <button
          type="submit"
          disabled={isSubmitting}
          className={classNames(styles.saveSleepScoreBtn, buttonStyles.primaryBtn)}
          title={existingSleepScore ? "Update sleep score" : "Save sleep score"}
        >
          {isSubmitting ? (
            "Saving..."
          ) : (
            <>{existingSleepScore ? "Update Sleep Score" : "Save Sleep Score"}</>
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={classNames(styles.cancelBtn, buttonStyles.secondaryBtn)}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
      </div>
    </FormContainer>
  );
}

export default SleepScoreForm;
