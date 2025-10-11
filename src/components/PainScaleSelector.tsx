import React, { useState, useEffect } from 'react';
import { Controller, Control } from 'react-hook-form';
import classNames from 'classnames';
import styles from './PainScaleSelector.module.css';
import { getPainFace } from './painScaleFaces.utils';

// Pain score descriptions from the PainScoreForm component
const painScoreDescriptions = [
  '0: Pain free',
  "1: Pain is very mild, barely noticeable. Most of the time you don't think about it",
  '2: Minor pain. Annoying and may have occasional stronger twinges',
  '3: Pain is noticeable and distracting, however, you can get used to it and adapt',
  '4: Moderate pain. If deeply involved in an activity, it can be ignored for a period of time',
  "5: Moderately strong pain. Can't be ignored for more than a few minutes",
  '6: Moderately strong pain that interferes with normal daily activities. Difficulty concentrating',
  '7: Severe pain that dominates your senses and limits your ability to perform normal activities',
  '8: Intense pain. Physical activity is severely limited. Conversing requires great effort',
  '9: Excruciating pain. Unable to converse. Crying out and/or moaning uncontrollably',
  '10: Unspeakable pain. Bedridden and possibly delirious. Very few people will ever experience this level of pain',
];

// No longer needed as we only use the detailed description

// Get the detailed description (part after the colon)
const getDetailedDescription = (description: string) => {
  const parts = description.split(':');
  return parts.length > 1 ? parts.slice(1).join(':').trim() : '';
};

interface PainScaleSelectorProps {
  value: number | null;
  onChange: (value: number) => void;
  name: string;
  control: Control<Record<string, unknown>>;
  error?: string;
}

const PainScaleSelector: React.FC<PainScaleSelectorProps> = ({
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
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleScoreSelect(score);
    }
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className={styles.painScaleContainer}>
          <div className={styles.painScaleSelector}>
            {painScoreDescriptions.map((description, index) => (
              <div
                key={index}
                className={classNames(styles.painScaleOption, {
                  [styles.selected]: selectedScore === index,
                })}
                onClick={() => {
                  handleScoreSelect(index);
                  field.onChange(index.toString());
                }}
                onKeyDown={(e) => handleKeyDown(e, index)}
                tabIndex={0}
                role="button"
                aria-pressed={selectedScore === index}
                aria-label={`Pain level ${index}: ${getDetailedDescription(description)}`}
              >
                <span className={styles.painScaleNumber}>{index}</span>
                <div className={styles.painScaleFace}>{getPainFace(index, { size: 36 })}</div>
              </div>
            ))}
          </div>

          {selectedScore !== null && (
            <div className={styles.painScaleDescriptionContainer}>
              <div className={styles.selectedFaceContainer}>
                {getPainFace(selectedScore, { size: 60 })}
              </div>
              <div className={styles.painScaleDescription}>
                {getDetailedDescription(painScoreDescriptions[selectedScore])}
              </div>
            </div>
          )}

          {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
      )}
    />
  );
};

export default PainScaleSelector;
