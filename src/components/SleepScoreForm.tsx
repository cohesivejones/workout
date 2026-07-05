import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { SleepScore } from '../types';
import { getLocalDateString } from '../utils/dates';
import styles from './SleepScoreForm.module.css';
import { Button } from './ui/Button';
import { Field, Input, Textarea } from './ui/Field';
import SleepScaleSelector from './SleepScaleSelector';
import FormContainer from './common/FormContainer';

interface SleepScoreFormProps {
  onSubmit: (sleepScore: Omit<SleepScore, 'id'>) => Promise<boolean>;
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
      date: existingSleepScore ? existingSleepScore.date : selectedDate || getLocalDateString(),
      score: existingSleepScore?.score?.toString() || '',
      notes: existingSleepScore?.notes || '',
    },
  });

  const watchScore = watch('score');

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
        setError('root', {
          type: 'manual',
          message: 'Failed to save sleep score. Please try again.',
        });
      }
    } catch (err) {
      setError('root', {
        type: 'manual',
        message: err instanceof Error ? err.message : 'An error occurred',
      });
    }
  };

  return (
    <FormContainer
      title={existingSleepScore ? 'Edit Sleep Score' : 'Add Sleep Score'}
      errorMessage={errors.root?.message}
      onSubmit={handleSubmit(onFormSubmit)}
      className={styles.sleepScoreForm}
    >
      <Field label="Date:" htmlFor="sleep-score-date" error={errors.date?.message}>
        <Input
          type="date"
          id="sleep-score-date"
          invalid={!!errors.date}
          {...register('date', { required: 'Date is required' })}
        />
      </Field>

      <div className={styles.sleepScoreInput}>
        <label htmlFor="sleep-score">Sleep Score (1-5):</label>
        <SleepScaleSelector
          name="score"
          control={control}
          value={selectedScore}
          onChange={(value) => {
            setValue('score', value.toString());
          }}
          error={errors.score?.message}
        />
      </div>

      <Field label="Notes (optional):" htmlFor="sleep-score-notes">
        <Textarea
          id="sleep-score-notes"
          {...register('notes')}
          placeholder="Add any additional notes about your sleep quality"
        />
      </Field>

      <div className={styles.formButtons}>
        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={isSubmitting}
          title={existingSleepScore ? 'Update sleep score' : 'Save sleep score'}
        >
          {isSubmitting ? (
            'Saving...'
          ) : (
            <>{existingSleepScore ? 'Update Sleep Score' : 'Save Sleep Score'}</>
          )}
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
      </div>
    </FormContainer>
  );
}

export default SleepScoreForm;
