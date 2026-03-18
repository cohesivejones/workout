import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Meal } from '../types';
import styles from './MealForm.module.css';
import classNames from 'classnames';
import buttonStyles from '../styles/common/buttons.module.css';
import FormContainer from './common/FormContainer';

interface MealFormProps {
  onSubmit: (meal: Omit<Meal, 'id'>) => Promise<boolean>;
  existingMeal?: Meal;
  selectedDate?: string;
  onCancel?: () => void;
}

interface FormValues {
  date: string;
  description: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

function MealForm({
  onSubmit,
  existingMeal,
  selectedDate,
  onCancel,
}: MealFormProps): React.ReactElement {
  // Use react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    defaultValues: {
      date: existingMeal
        ? new Date(existingMeal.date).toISOString().split('T')[0]
        : selectedDate || new Date().toISOString().split('T')[0],
      description: existingMeal?.description || '',
      calories: existingMeal?.calories?.toString() || '',
      protein: existingMeal?.protein?.toString() || '',
      carbs: existingMeal?.carbs?.toString() || '',
      fat: existingMeal?.fat?.toString() || '',
    },
  });

  // Form submission handler
  const onFormSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const success = await onSubmit({
        date: data.date,
        description: data.description,
        calories: parseFloat(data.calories),
        protein: parseFloat(data.protein),
        carbs: parseFloat(data.carbs),
        fat: parseFloat(data.fat),
      });

      if (!success) {
        setError('root', {
          type: 'manual',
          message: 'Failed to save meal. Please try again.',
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
      title={existingMeal ? 'Edit Meal' : 'Add Meal'}
      errorMessage={errors.root?.message}
      onSubmit={handleSubmit(onFormSubmit)}
      className={styles.mealForm}
    >
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="meal-date">Date:</label>
          <input
            type="date"
            id="meal-date"
            {...register('date', { required: 'Date is required' })}
          />
          {errors.date && <span className={styles.errorMessage}>{errors.date.message}</span>}
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="meal-description">Description:</label>
          <input
            type="text"
            id="meal-description"
            {...register('description', { required: 'Description is required' })}
            placeholder="e.g., Chicken and Rice, Breakfast - Oats"
          />
          {errors.description && (
            <span className={styles.errorMessage}>{errors.description.message}</span>
          )}
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="meal-calories">Calories:</label>
          <input
            type="number"
            id="meal-calories"
            step="0.1"
            {...register('calories', {
              required: 'Calories is required',
              min: { value: 0, message: 'Calories must be positive' },
            })}
          />
          {errors.calories && (
            <span className={styles.errorMessage}>{errors.calories.message}</span>
          )}
        </div>
      </div>

      <div className={styles.macrosRow}>
        <div className={styles.formGroup}>
          <label htmlFor="meal-protein">Protein (g):</label>
          <input
            type="number"
            id="meal-protein"
            step="0.1"
            {...register('protein', {
              required: 'Protein is required',
              min: { value: 0, message: 'Protein must be positive' },
            })}
          />
          {errors.protein && <span className={styles.errorMessage}>{errors.protein.message}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="meal-carbs">Carbs (g):</label>
          <input
            type="number"
            id="meal-carbs"
            step="0.1"
            {...register('carbs', {
              required: 'Carbs is required',
              min: { value: 0, message: 'Carbs must be positive' },
            })}
          />
          {errors.carbs && <span className={styles.errorMessage}>{errors.carbs.message}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="meal-fat">Fat (g):</label>
          <input
            type="number"
            id="meal-fat"
            step="0.1"
            {...register('fat', {
              required: 'Fat is required',
              min: { value: 0, message: 'Fat must be positive' },
            })}
          />
          {errors.fat && <span className={styles.errorMessage}>{errors.fat.message}</span>}
        </div>
      </div>

      <div className={styles.formButtons}>
        <button
          type="submit"
          disabled={isSubmitting}
          className={classNames(styles.saveMealBtn, buttonStyles.primaryBtn)}
          title={existingMeal ? 'Update meal' : 'Save meal'}
        >
          {isSubmitting ? 'Saving...' : <>{existingMeal ? 'Update Meal' : 'Save Meal'}</>}
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

export default MealForm;
