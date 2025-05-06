import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { PainScore } from "../types";
import styles from "./PainScoreForm.module.css";
import classNames from "classnames";
import buttonStyles from "../styles/common/buttons.module.css";
import PainScaleSelector from "./PainScaleSelector";
import FormContainer from "./common/FormContainer";

interface PainScoreFormProps {
  onSubmit: (painScore: Omit<PainScore, "id">) => Promise<boolean>;
  existingPainScore?: PainScore;
  selectedDate?: string;
  onCancel?: () => void;
}

interface FormValues {
  date: string;
  score: string;
  notes: string;
}

// Pain score descriptions are now in the PainScaleSelector component

function PainScoreForm({
  onSubmit,
  existingPainScore,
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
    control,
    setValue,
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
    <FormContainer
      title={existingPainScore ? "Edit Pain Score" : "Add Pain Score"}
      errorMessage={errors.root?.message}
      onSubmit={handleSubmit(onFormSubmit)}
      className={styles.painScoreForm}
    >
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
          <PainScaleSelector
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
            className={classNames(
              styles.savePainScoreBtn,
              buttonStyles.primaryBtn,
            )}
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
              className={classNames(
                styles.cancelBtn,
                buttonStyles.secondaryBtn,
              )}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
        </div>
      {/* Pain score legend is now integrated into the PainScaleSelector component */}
    </FormContainer>
  );
}

export default PainScoreForm;
