import React, { useState, useEffect, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Meal } from '../types';
import { searchMeals, analyzeMealNutrition } from '../api';
import { getLocalDateString } from '../utils/dates';
import { useNutritionLabelScanner } from '../hooks/useNutritionLabelScanner';
import styles from './MealForm.module.css';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Field, Input } from './ui/Field';
import FormContainer from './common/FormContainer';
import { proteinQuality } from '../utils/nutrition';

interface MealFormProps {
  onSubmit: (meal: Omit<Meal, 'id'>) => Promise<boolean>;
  /** Called once after all meals are saved (e.g. to navigate away). */
  onSuccess?: () => void;
  existingMeal?: Meal;
  selectedDate?: string;
  onCancel?: () => void;
}

interface FormValues {
  date: string;
  description: string;
  multiplier: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

function MealForm({
  onSubmit,
  onSuccess,
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
    setValue,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      date: existingMeal ? existingMeal.date : selectedDate || getLocalDateString(),
      description: existingMeal?.description || '',
      multiplier: '1',
      calories: existingMeal?.calories?.toString() || '',
      protein: existingMeal?.protein?.toString() || '',
      carbs: existingMeal?.carbs?.toString() || '',
      fat: existingMeal?.fat?.toString() || '',
    },
  });

  // Autocomplete state
  const [searchResults, setSearchResults] = useState<Meal[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { triggerScan, isScanning, scanError, fileInputProps } = useNutritionLabelScanner(
    (data) => {
      if (data.calories != null) setValue('calories', data.calories.toString());
      if (data.protein != null) setValue('protein', data.protein.toString());
      if (data.fat != null) setValue('fat', data.fat.toString());
      if (data.carbs != null) setValue('carbs', data.carbs.toString());
    }
  );

  // Watch description field for changes
  const descriptionValue = watch('description');
  const multiplierValue = watch('multiplier');
  const [caloriesValue, proteinValue, carbsValue, fatValue] = watch([
    'calories',
    'protein',
    'carbs',
    'fat',
  ]);
  const nutritionEmpty = !caloriesValue && !proteinValue && !carbsValue && !fatValue;

  // Live protein-quality rating (protein per 100 kcal) for the weights program.
  const quality = proteinQuality(parseFloat(caloriesValue), parseFloat(proteinValue));

  // Handle clicks outside suggestions to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search effect
  useEffect(() => {
    // Don't search if editing existing meal or if description is too short
    if (existingMeal || !descriptionValue || descriptionValue.length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await searchMeals(descriptionValue);
        setSearchResults(results);
        setShowSuggestions(results.length > 0);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [descriptionValue, existingMeal]);

  // Handle selecting a meal from suggestions
  const handleSelectMeal = (meal: Meal) => {
    setValue('description', meal.description);
    setValue('calories', meal.calories.toString());
    setValue('protein', meal.protein.toString());
    setValue('carbs', meal.carbs.toString());
    setValue('fat', meal.fat.toString());
    setShowSuggestions(false);
    setSearchResults([]);
  };

  const handleClearNutrition = () => {
    setValue('calories', '');
    setValue('protein', '');
    setValue('carbs', '');
    setValue('fat', '');
  };

  // Handle AI nutrition analysis
  const handleAIAnalysis = async () => {
    const description = descriptionValue?.trim();

    if (!description || description.length < 3) {
      setError('description', {
        type: 'manual',
        message: 'Please enter a meal description first',
      });
      return;
    }

    try {
      setIsAnalyzingAI(true);
      setError('root', { type: 'manual', message: '' }); // Clear any existing errors

      const nutritionData = await analyzeMealNutrition(description);

      // Populate form fields with AI results
      setValue('calories', nutritionData.calories.toString());
      setValue('protein', nutritionData.protein.toString());
      setValue('carbs', nutritionData.carbs.toString());
      setValue('fat', nutritionData.fat.toString());
    } catch (err) {
      console.error('AI analysis failed:', err);
      setError('root', {
        type: 'manual',
        message: err instanceof Error ? err.message : 'Failed to analyze meal. Please try again.',
      });
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // Form submission handler
  const onFormSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const multiplier = Math.max(1, parseInt(data.multiplier || '1', 10) || 1);
      const meal = {
        date: data.date,
        description: data.description,
        calories: parseFloat(data.calories),
        protein: parseFloat(data.protein),
        carbs: parseFloat(data.carbs),
        fat: parseFloat(data.fat),
      };

      for (let i = 0; i < multiplier; i++) {
        const success = await onSubmit(meal);
        if (!success) {
          setError('root', {
            type: 'manual',
            message: 'Failed to save meal. Please try again.',
          });
          return;
        }
      }

      // Navigate (or otherwise finish) only after every meal is saved, so the
      // destination page fetches the complete list.
      onSuccess?.();
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
        <Field label="Date:" htmlFor="meal-date" error={errors.date?.message}>
          <Input
            type="date"
            id="meal-date"
            invalid={!!errors.date}
            {...register('date', { required: 'Date is required' })}
          />
        </Field>
      </div>

      <div className={styles.formRow}>
        <Field label="Description:" htmlFor="meal-description" error={errors.description?.message}>
          <div className={styles.autocompleteWrapper}>
            <Input
              type="text"
              id="meal-description"
              invalid={!!errors.description}
              {...register('description', { required: 'Description is required' })}
              placeholder="e.g., Chicken and Rice, Breakfast - Oats"
              autoComplete="off"
            />
            {isSearching && <span className={styles.searchingIndicator}>Searching...</span>}
            {showSuggestions && searchResults.length > 0 && (
              <div
                ref={suggestionsRef}
                className={styles.suggestions}
                data-testid="meal-suggestions"
              >
                {searchResults.map((meal) => (
                  <div
                    key={meal.id}
                    className={styles.suggestionItem}
                    onClick={() => handleSelectMeal(meal)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleSelectMeal(meal);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.suggestionDescription}>{meal.description}</div>
                    <div className={styles.suggestionMacros}>
                      {meal.calories}cal • {meal.protein}g protein • {meal.carbs}g carbs •{' '}
                      {meal.fat}g fat
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Field>
      </div>

      {!existingMeal && (
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <span className={styles.multiplierLabel} id="multiplier-label">
              Multiplier:
            </span>
            <div
              className={styles.multiplierToggle}
              role="group"
              aria-labelledby="multiplier-label"
            >
              {['1', '2', '3'].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.multiplierButton} ${
                    multiplierValue === value ? styles.multiplierButtonActive : ''
                  }`}
                  aria-pressed={multiplierValue === value}
                  onClick={() => setValue('multiplier', value)}
                >
                  {value}×
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!existingMeal && (
        <div className={styles.formRow}>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className={styles.aiAnalyzeBtn}
            onClick={handleAIAnalysis}
            disabled={
              isAnalyzingAI || isSubmitting || !descriptionValue || descriptionValue.length < 3
            }
            title="Use AI to estimate nutrition from description"
          >
            {isAnalyzingAI && <span className={styles.spinner} data-testid="loading-spinner" />}
            {isAnalyzingAI ? 'Analyzing...' : '🤖 Get Nutrition with AI'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className={styles.aiAnalyzeBtn}
            onClick={triggerScan}
            disabled={isScanning || isSubmitting}
            title="Scan a nutrition label"
          >
            {isScanning && <span className={styles.spinner} data-testid="loading-spinner" />}
            {isScanning ? 'Scanning...' : 'Scan Label'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className={styles.aiAnalyzeBtn}
            onClick={handleClearNutrition}
            disabled={nutritionEmpty || isSubmitting}
            title="Clear nutrition fields"
          >
            Clear
          </Button>
          <input {...fileInputProps} />
          {scanError && <p className={styles.aiHint}>{scanError}</p>}
          <p className={styles.aiHint}>
            Enter a meal description above, then click to get estimated nutrition info
          </p>
        </div>
      )}

      <div className={styles.formRow}>
        <Field label="Calories:" htmlFor="meal-calories" error={errors.calories?.message}>
          <Input
            type="number"
            id="meal-calories"
            step="0.1"
            invalid={!!errors.calories}
            {...register('calories', {
              required: 'Calories is required',
              min: { value: 0, message: 'Calories must be positive' },
            })}
          />
        </Field>
      </div>

      <div className={styles.macrosRow}>
        <Field label="Protein (g):" htmlFor="meal-protein" error={errors.protein?.message}>
          <Input
            type="number"
            id="meal-protein"
            step="0.1"
            invalid={!!errors.protein}
            {...register('protein', {
              required: 'Protein is required',
              min: { value: 0, message: 'Protein must be positive' },
            })}
          />
        </Field>

        <Field label="Carbs (g):" htmlFor="meal-carbs" error={errors.carbs?.message}>
          <Input
            type="number"
            id="meal-carbs"
            step="0.1"
            invalid={!!errors.carbs}
            {...register('carbs', {
              required: 'Carbs is required',
              min: { value: 0, message: 'Carbs must be positive' },
            })}
          />
        </Field>

        <Field label="Fat (g):" htmlFor="meal-fat" error={errors.fat?.message}>
          <Input
            type="number"
            id="meal-fat"
            step="0.1"
            invalid={!!errors.fat}
            {...register('fat', {
              required: 'Fat is required',
              min: { value: 0, message: 'Fat must be positive' },
            })}
          />
        </Field>
      </div>

      {quality && (
        <div className={styles.proteinQuality} aria-live="polite" data-testid="protein-quality">
          <div className={styles.pqInfo}>
            <span className={styles.pqLabel}>Protein quality</span>
            <span className={styles.pqRatio}>
              <strong>{quality.ratio.toFixed(1)} g</strong> protein / 100 kcal
            </span>
          </div>
          <Badge variant={quality.variant}>{quality.tier}</Badge>
        </div>
      )}

      <div className={styles.formButtons}>
        <Button
          type="submit"
          variant="primary"
          className={styles.saveMealBtn}
          disabled={isSubmitting}
          title={existingMeal ? 'Update meal' : 'Save meal'}
        >
          {isSubmitting ? 'Saving...' : <>{existingMeal ? 'Update Meal' : 'Save Meal'}</>}
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            className={styles.cancelBtn}
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

export default MealForm;
