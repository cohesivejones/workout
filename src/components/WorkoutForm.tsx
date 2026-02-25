import * as React from 'react';
import { WorkoutFormProps, WorkoutExercise } from '../types';
import CreatableSelect from 'react-select/creatable';
import classNames from 'classnames';
import styles from './WorkoutForm.module.css';
import buttonStyles from '../styles/common/buttons.module.css';
import { useUserContext } from '../contexts/useUserContext';
import { fetchRecentExerciseData } from '../api';
import { useForm, useFieldArray, Controller, SubmitHandler } from 'react-hook-form';
import { SingleValue } from 'react-select';
import { lbsToKg } from '../utils/weight';

interface FormValues {
  date: string;
  withInstructor: boolean;
  exercises: WorkoutExercise[];
  currentExercise: {
    name: string;
    reps: string;
    weight: string;
    time_seconds: string;
  };
}

// Helper function to get local date string in YYYY-MM-DD format
const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function WorkoutForm({
  onSubmit,
  savedExercises,
  onSaveExercise,
  existingWorkout,
  onCancel,
}: WorkoutFormProps): React.ReactElement {
  const { user } = useUserContext();
  const [isSavingExercise, setIsSavingExercise] = React.useState<boolean>(false);

  // Initialize form with default values
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      date: existingWorkout ? existingWorkout.date : getLocalDateString(),
      withInstructor: existingWorkout?.withInstructor || false,
      exercises: existingWorkout?.exercises || [],
      currentExercise: {
        name: '',
        reps: '',
        weight: '',
        time_seconds: '',
      },
    },
  });

  // Use fieldArray to manage the dynamic exercises list
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'exercises',
  });

  // Watch current values
  const currentExercise = watch('currentExercise');
  const exercises = watch('exercises');

  const onFormSubmit: SubmitHandler<FormValues> = async (data) => {
    if (exercises.length === 0 || !user) return;

    try {
      const success = await onSubmit({
        date: data.date,
        withInstructor: data.withInstructor,
        exercises: data.exercises.map((ex) => ({
          ...ex,
          reps: Number(ex.reps),
          weight: ex.weight ? Number(ex.weight) : null,
          time_seconds: ex.time_seconds ? Number(ex.time_seconds) : null,
        })),
      });

      if (success) {
        reset({
          ...data,
          exercises: [],
          currentExercise: {
            name: '',
            reps: '',
            weight: '',
            time_seconds: '',
          },
        });
      }
    } catch (error) {
      setError('root', {
        type: 'server',
        message: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  const addExercise = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!currentExercise.name || !currentExercise.reps) return;

    const name = currentExercise.name.trim();
    if (name) {
      setIsSavingExercise(true);
      try {
        const success = await onSaveExercise(name);
        if (success) {
          append({
            name,
            reps: Number(currentExercise.reps),
            weight: currentExercise.weight ? Number(currentExercise.weight) : null,
            time_seconds: currentExercise.time_seconds
              ? Number(currentExercise.time_seconds)
              : null,
          });

          // Reset current exercise fields
          setValue('currentExercise', {
            name: '',
            reps: '',
            weight: '',
            time_seconds: '',
          });
        }
      } catch (error) {
        setError('root', {
          type: 'server',
          message: error instanceof Error ? error.message : 'An error occurred',
        });
      } finally {
        setIsSavingExercise(false);
      }
    }
  };

  const handlePopulateRepsAndWeight = async (
    val: SingleValue<{ label: string; value: string }>
  ) => {
    if (val === null) {
      setValue('currentExercise.reps', '');
      setValue('currentExercise.weight', '');
      setValue('currentExercise.time_seconds', '');
      return;
    }
    const exerciseId = savedExercises.find((ex) => ex.name === val.value)?.id;
    if (!exerciseId) return;
    if (!user) return;
    try {
      const recentData = await fetchRecentExerciseData(exerciseId);
      setValue('currentExercise.reps', String(recentData.reps));
      setValue('currentExercise.weight', recentData.weight ? String(recentData.weight) : '');
      setValue(
        'currentExercise.time_seconds',
        recentData.time_seconds ? String(recentData.time_seconds) : ''
      );
    } catch {
      // fail silently
    }
  };

  const exerciseSelectOptions = savedExercises.map((exercise) => ({
    label: exercise.name,
    value: exercise.name,
  }));
  return (
    <div className={styles.workoutForm}>
      <h2>{existingWorkout ? 'Edit Workout' : 'New Workout'}</h2>
      {errors.root && <div className={styles.errorMessage}>{errors.root.message}</div>}
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <div className={styles.dateInput}>
          <label htmlFor="workout-date">Workout Date:</label>
          <input
            type="date"
            id="workout-date"
            className={styles.exerciseInputField}
            {...register('date')}
          />
        </div>
        <div className={styles.instructorCheckbox}>
          <label htmlFor="with-instructor">
            <input type="checkbox" id="with-instructor" {...register('withInstructor')} />
            With Instructor
          </label>
        </div>
        <div className={styles.exerciseInput}>
          <Controller
            name="currentExercise.name"
            control={control}
            render={({ field }) => {
              const selectedExerciseOption = field.value
                ? { label: field.value, value: field.value }
                : null;
              return (
                <CreatableSelect
                  isClearable
                  placeholder="Select or create an exercise"
                  options={exerciseSelectOptions}
                  onChange={(val) => {
                    field.onChange(val ? val.value : '');
                    handlePopulateRepsAndWeight(val);
                  }}
                  value={selectedExerciseOption}
                  className={styles.reactSelectContainer}
                  classNamePrefix="reactSelect"
                  formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
                />
              );
            }}
          />
          <input
            type="number"
            placeholder="Reps"
            min="1"
            className={styles.exerciseInputField}
            {...register('currentExercise.reps')}
          />
          <div className={styles.weightInputContainer}>
            <div className={styles.weightInputWrapper}>
              <input
                type="number"
                placeholder="Weight (lbs)"
                min="0"
                step="0.5"
                className={`${styles.exerciseInputField} ${styles.weightInput}`}
                {...register('currentExercise.weight')}
              />
              <span className={styles.weightSuffix}>
                {currentExercise.weight ? `${lbsToKg(Number(currentExercise.weight))} kg` : '0 kg'}
              </span>
            </div>
          </div>
          <input
            type="number"
            placeholder="Time (sec)"
            min="0"
            step="1"
            className={styles.exerciseInputField}
            {...register('currentExercise.time_seconds')}
          />
          <button
            type="button"
            onClick={addExercise}
            disabled={
              !currentExercise.name || !currentExercise.reps || isSavingExercise || isSubmitting
            }
            className={classNames(styles.addExerciseBtn, buttonStyles.secondaryBtn)}
            title="Add exercise to workout"
          >
            {isSavingExercise ? 'Adding...' : <>Add Exercise</>}
          </button>
        </div>

        <div className={styles.exerciseList}>
          <h3>Current Exercises:</h3>
          {fields.length === 0 ? (
            <p>No exercises added yet</p>
          ) : (
            <ul data-testid="exercise-list">
              {fields.map((field, index) => (
                <li key={field.id} className={styles.exerciseItem}>
                  <div className={styles.exerciseInfo}>
                    {exercises[index].name} - {exercises[index].reps} reps
                    {exercises[index].weight ? ` - ${exercises[index].weight} lbs` : ''}
                    {exercises[index].time_seconds ? ` - ${exercises[index].time_seconds} sec` : ''}
                    {(exercises[index].newReps ||
                      exercises[index].newWeight ||
                      exercises[index].newTime) && (
                      <div className={styles.badgeContainer}>
                        {exercises[index].newReps && (
                          <span className={styles.newBadge}>NEW REPS</span>
                        )}
                        {exercises[index].newWeight && (
                          <span className={styles.newBadge}>NEW WEIGHT</span>
                        )}
                        {exercises[index].newTime && (
                          <span className={styles.newBadge}>NEW TIME</span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={classNames(styles.removeExerciseBtn, buttonStyles.secondaryBtn)}
                    onClick={() => remove(index)}
                    title="Remove exercise"
                  >
                    x
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.formButtons}>
          <button
            type="submit"
            disabled={fields.length === 0 || isSubmitting}
            className={classNames(styles.saveWorkoutBtn, buttonStyles.primaryBtn)}
            title={existingWorkout ? 'Update workout' : 'Save workout'}
          >
            {isSubmitting ? (
              'Saving...'
            ) : (
              <>{existingWorkout ? 'Update Workout' : 'Save Workout'}</>
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
      </form>
    </div>
  );
}

export default WorkoutForm;
