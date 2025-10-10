import React, { useState, useEffect } from "react";
import { Controller, Control } from "react-hook-form";
import classNames from "classnames";
import styles from "./SleepScaleSelector.module.css";
import { getSleepFace } from "./SleepScaleFaces";

// Sleep score descriptions
const sleepScoreDescriptions = [
  "1: Very Poor - Sleep was highly fragmented and interrupted, with many awakenings and very little restorative deep sleep.",
  "2: Poor - Sleep was frequently interrupted, with many awakenings and periods of light sleep.",
  "3: Fair - Sleep had some interruptions, with periods of lighter sleep or more frequent awakenings.",
  "4: Good - Sleep was generally continuous, with only occasional brief awakenings or light sleep phases.",
  "5: Excellent - Sleep was consistently uninterrupted and restorative, with minimal or no awakenings throughout the night.",
];

// Get the detailed description (part after the colon)
const getDetailedDescription = (description: string) => {
  const parts = description.split(":");
  return parts.length > 1 ? parts.slice(1).join(":").trim() : "";
};

interface SleepScaleSelectorProps {
  value: number | null;
  onChange: (value: number) => void;
  name: string;
  control: Control<Record<string, unknown>>;
  error?: string;
}

const SleepScaleSelector: React.FC<SleepScaleSelectorProps> = ({
  value,
  onChange,
  name,
  control,
  error,
}) => {
  const [selectedScore, setSelectedScore] = useState<number | null>(value);

  useEffect(() => {
    setSelectedScore(value);
  }, [value]);

  const handleScoreSelect = (score: number) => {
    setSelectedScore(score);
    onChange(score);
  };

  const handleKeyDown = (e: React.KeyboardEvent, score: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleScoreSelect(score);
    }
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className={styles.sleepScaleContainer}>
          <div className={styles.sleepScaleSelector}>
            {sleepScoreDescriptions.map((description, index) => {
              // Adjust index to be 1-based for sleep scores
              const scoreValue = index + 1;
              return (
                <div
                  key={scoreValue}
                  className={classNames(styles.sleepScaleOption, {
                    [styles.selected]: selectedScore === scoreValue,
                  })}
                  onClick={() => {
                    handleScoreSelect(scoreValue);
                    field.onChange(scoreValue.toString());
                  }}
                  onKeyDown={(e) => handleKeyDown(e, scoreValue)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selectedScore === scoreValue}
                  aria-label={`Sleep level ${scoreValue}: ${getDetailedDescription(
                    description
                  )}`}
                >
                  <span className={styles.sleepScaleNumber}>{scoreValue}</span>
                  <div className={styles.sleepScaleFace}>
                    {getSleepFace(scoreValue, { size: 36 })}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedScore !== null && (
            <div className={styles.sleepScaleDescriptionContainer}>
              <div className={styles.selectedFaceContainer}>
                {getSleepFace(selectedScore, { size: 60 })}
              </div>
              <div className={styles.sleepScaleDescription}>
                {getDetailedDescription(
                  sleepScoreDescriptions[selectedScore - 1]
                )}
              </div>
            </div>
          )}

          <div className={styles.sleepScoreNote}>
            Note: The score for today reflects your sleep quality from last night/this morning.
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
      )}
    />
  );
};

export default SleepScaleSelector;
