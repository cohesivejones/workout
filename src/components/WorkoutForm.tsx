import * as React from 'react';
import { Link } from 'wouter';
import { Workout, Exercise, WorkoutExercise } from '../types';

export interface WorkoutFormProps {
  onSubmit: (workout: Omit<Workout, 'id'>) => Promise<boolean>;
  savedExercises: Exercise[];
  onSaveExercise: (exerciseName: string) => Promise<boolean>;
  existingWorkout?: Workout;
  onCancel?: () => void;
}
import CreatableSelect from 'react-select/creatable';
import styles from './WorkoutForm.module.css';
import { Button } from './ui/Button';
import { Field, Input } from './ui/Field';
import { useUserContext } from '../contexts/useUserContext';
import { fetchRecentExerciseData } from '../api';
import { useForm, useFieldArray, Controller, SubmitHandler } from 'react-hook-form';
import { SingleValue } from 'react-select';
import { lbsToKg, kgToLbs, WeightUnit, formatWeightWithKg } from '../utils/weight';
import { toExerciseProgressionPath } from '../utils/paths';
import { toKebabCase } from '../utils/strings';
import { getLocalDateString } from '../utils/dates';
import { GiMuscleUp } from 'react-icons/gi';
import { IoRepeat } from 'react-icons/io5';
import { IoMdStopwatch } from 'react-icons/io';
import { FaWeightHanging, FaTrophy } from 'react-icons/fa';
import { Badge } from './ui/Badge';

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
          <Field label="Workout Date" htmlFor="workout-date">
            <Input type="date" id="workout-date" {...register('date')} />
          </Field>
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
            <Input type="number" placeholder="Reps" min="1" {...register('currentExercise.reps')} />
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
                  <Input
                    type="number"
                    placeholder={`Weight (${weightUnit})`}
                    min="0"
                    step="0.5"
                    className={styles.weightInput}
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
            <Input
              type="number"
              placeholder="Time (sec)"
              min="0"
              step="1"
              {...register('currentExercise.timeSeconds')}
            />
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={addExercise}
              disabled={
                !currentExercise.name || !currentExercise.reps || isSavingExercise || isSubmitting
              }
              title="Add exercise to workout"
            >
              {isSavingExercise ? 'Adding...' : <>Add Exercise</>}
            </Button>
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
                    className={`${styles.exerciseItem} ${
                      exercises[index].newReps ||
                      exercises[index].newWeight ||
                      exercises[index].newTime
                        ? styles.prItem
                        : ''
                    }`}
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
                            <FaTrophy
                              className={styles.prTrophy}
                              aria-hidden="true"
                              title="Personal record"
                            />
                            {exercises[index].newReps && (
                              <Badge variant="accent" size="sm">
                                NEW REPS
                              </Badge>
                            )}
                            {exercises[index].newWeight && (
                              <Badge variant="accent" size="sm">
                                NEW WEIGHT
                              </Badge>
                            )}
                            {exercises[index].newTime && (
                              <Badge variant="accent" size="sm">
                                NEW TIME
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      iconOnly
                      onClick={() => remove(index)}
                      title="Remove exercise"
                    >
                      x
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={styles.formButtons}>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={fields.length === 0 || isSubmitting}
            title={existingWorkout ? 'Update workout' : 'Save workout'}
          >
            {isSubmitting ? (
              'Saving...'
            ) : (
              <>{existingWorkout ? 'Update Workout' : 'Save Workout'}</>
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
      </form>
    </div>
  );
}

export default WorkoutForm;
