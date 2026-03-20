import * as React from 'react';
import { Link } from 'wouter';
import { WorkoutFormProps, WorkoutExercise } from '../types';
import CreatableSelect from 'react-select/creatable';
import classNames from 'classnames';
import styles from './WorkoutForm.module.css';
import buttonStyles from '../styles/common/buttons.module.css';
import { useUserContext } from '../contexts/useUserContext';
import { fetchRecentExerciseData } from '../api';
import { useForm, useFieldArray, Controller, SubmitHandler } from 'react-hook-form';
import { SingleValue } from 'react-select';
import { lbsToKg, kgToLbs, WeightUnit, formatWeightWithKg } from '../utils/weight';
import { toExerciseProgressionPath } from '../utils/paths';
import { toKebabCase } from '../utils/strings';
import { GiMuscleUp } from 'react-icons/gi';
import { IoRepeat } from 'react-icons/io5';
import { IoMdStopwatch } from 'react-icons/io';
import { FaWeightHanging } from 'react-icons/fa';

interface FormValues {
  date: string;
  withInstructor: boolean;
  exercises: WorkoutExercise[];
  currentExercise: {
    name: string;
    reps: string;
    weight: string;
    timeSeconds: string;
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
  const [weightUnit, setWeightUnit] = React.useState<WeightUnit>('lbs');

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
        timeSeconds: '',
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
          timeSeconds: ex.timeSeconds ? Number(ex.timeSeconds) : null,
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
            timeSeconds: '',
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
            weight: currentExercise.weight
              ? weightUnit === 'kgs'
                ? kgToLbs(Number(currentExercise.weight)) // Convert to lbs for storage
                : Number(currentExercise.weight)
              : null,
            timeSeconds: currentExercise.timeSeconds ? Number(currentExercise.timeSeconds) : null,
          });

          // Reset current exercise fields
          setValue('currentExercise', {
            name: '',
            reps: '',
            weight: '',
            timeSeconds: '',
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
      setValue('currentExercise.timeSeconds', '');
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
        'currentExercise.timeSeconds',
        recentData.timeSeconds ? String(recentData.timeSeconds) : ''
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
        <div className={styles.formSection}>
          <div className={styles.dateInput}>
            <label htmlFor="workout-date">Workout Date</label>
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
        </div>

        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>Add Exercises</h3>
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
                <div className={styles.unitToggle}>
                  <button
                    type="button"
                    className={`${styles.unitButton} ${weightUnit === 'lbs' ? styles.unitButtonActive : ''}`}
                    onClick={() => {
                      if (weightUnit === 'kgs' && currentExercise.weight) {
                        // Convert current kg value to lbs
                        const kgValue = Number(currentExercise.weight);
                        setValue('currentExercise.weight', String(kgToLbs(kgValue)));
                      }
                      setWeightUnit('lbs');
                    }}
                  >
                    lbs
                  </button>
                  <button
                    type="button"
                    className={`${styles.unitButton} ${weightUnit === 'kgs' ? styles.unitButtonActive : ''}`}
                    onClick={() => {
                      if (weightUnit === 'lbs' && currentExercise.weight) {
                        // Convert current lbs value to kg
                        const lbsValue = Number(currentExercise.weight);
                        setValue('currentExercise.weight', String(lbsToKg(lbsValue)));
                      }
                      setWeightUnit('kgs');
                    }}
                  >
                    kgs
                  </button>
                </div>
                <div className={styles.weightInputGroup}>
                  <input
                    type="number"
                    placeholder={`Weight (${weightUnit})`}
                    min="0"
                    step="0.5"
                    className={`${styles.exerciseInputField} ${styles.weightInput}`}
                    {...register('currentExercise.weight')}
                  />
                  {currentExercise.weight && (
                    <span className={styles.weightSuffix}>
                      {weightUnit === 'lbs'
                        ? `${lbsToKg(Number(currentExercise.weight))} kgs`
                        : `${kgToLbs(Number(currentExercise.weight))} lbs`}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <input
              type="number"
              placeholder="Time (sec)"
              min="0"
              step="1"
              className={styles.exerciseInputField}
              {...register('currentExercise.timeSeconds')}
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
        </div>

        <div className={styles.formSection}>
          <div className={styles.exerciseList}>
            <h3>Exercises</h3>
            {fields.length === 0 ? (
              <p
                style={{
                  textAlign: 'center',
                  color: '#9ca3af',
                  padding: '32px 16px',
                  fontSize: '14px',
                }}
              >
                <GiMuscleUp
                  style={{
                    display: 'inline',
                    marginRight: '8px',
                    fontSize: '20px',
                    verticalAlign: 'middle',
                  }}
                />{' '}
                No exercises added yet. Add your first exercise above to get started!
              </p>
            ) : (
              <ul data-testid="exercise-list">
                {fields.map((field, index) => (
                  <li
                    key={field.id}
                    className={styles.exerciseItem}
                    data-testid={`added-exercise-${toKebabCase(exercises[index].name)}`}
                  >
                    <div className={styles.exerciseInfo}>
                      <div className={styles.exerciseName}>
                        {exercises[index].id ? (
                          <Link to={toExerciseProgressionPath(exercises[index].id!)}>
                            {exercises[index].name}
                          </Link>
                        ) : (
                          exercises[index].name
                        )}
                      </div>
                      <div className={styles.exerciseDetails}>
                        <span className={styles.exerciseDetail}>
                          <span className={styles.exerciseDetailIcon}>
                            <IoRepeat />
                          </span>
                          {exercises[index].reps} reps
                        </span>
                        {exercises[index].weight && (
                          <span className={styles.exerciseDetail}>
                            <span className={styles.exerciseDetailIcon}>
                              <FaWeightHanging />
                            </span>
                            {formatWeightWithKg(exercises[index].weight)}
                          </span>
                        )}
                        {exercises[index].timeSeconds && (
                          <span className={styles.exerciseDetail}>
                            <span className={styles.exerciseDetailIcon}>
                              <IoMdStopwatch />
                            </span>
                            {exercises[index].timeSeconds} sec
                          </span>
                        )}
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
                    </div>
                    <button
                      type="button"
                      className={classNames(
                        styles.removeExerciseBtn,
                        buttonStyles.secondaryIconBtn
                      )}
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
