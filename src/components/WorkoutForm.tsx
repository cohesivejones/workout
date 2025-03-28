import * as React from "react";
import { WorkoutFormProps, WorkoutExercise } from "../types";
import CreatableSelect from "react-select/creatable";
import "./WorkoutForm.css";
import { useUserContext } from "../contexts/useUserContext";
import { fetchRecentExerciseData } from "../api";
import {
  useForm,
  useFieldArray,
  Controller,
  SubmitHandler,
} from "react-hook-form";
import { SingleValue } from "react-select";

interface FormValues {
  date: string;
  withInstructor: boolean;
  exercises: WorkoutExercise[];
  currentExercise: {
    name: string;
    reps: string;
    weight: string;
  };
}

function WorkoutForm({
  onSubmit,
  savedExercises,
  onSaveExercise,
  existingWorkout,
}: WorkoutFormProps): React.ReactElement {
  const { user } = useUserContext();
  const [isSavingExercise, setIsSavingExercise] =
    React.useState<boolean>(false);

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
      date: existingWorkout
        ? new Date(existingWorkout.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      withInstructor: existingWorkout?.withInstructor || false,
      exercises: existingWorkout?.exercises || [],
      currentExercise: {
        name: "",
        reps: "",
        weight: "",
      },
    },
  });

  // Use fieldArray to manage the dynamic exercises list
  const { fields, append, remove } = useFieldArray({
    control,
    name: "exercises",
  });

  // Watch current values
  const currentExercise = watch("currentExercise");
  const exercises = watch("exercises");

  const onFormSubmit: SubmitHandler<FormValues> = async (data) => {
    if (exercises.length === 0 || !user) return;

    try {
      const success = await onSubmit({
        userId: user.id,
        date: data.date,
        withInstructor: data.withInstructor,
        exercises: data.exercises.map((ex) => ({
          ...ex,
          reps: Number(ex.reps),
        })),
      });

      if (success) {
        reset({
          ...data,
          exercises: [],
          currentExercise: {
            name: "",
            reps: "",
            weight: "",
          },
        });
      }
    } catch (err) {
      setError("serverError" as any, {
        type: "server",
        message: err instanceof Error ? err.message : "An error occurred",
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
              ? Number(currentExercise.weight)
              : null,
          });

          // Reset current exercise fields
          setValue("currentExercise", {
            name: "",
            reps: "",
            weight: "",
          });
        }
      } catch (err) {
        setError("serverError" as any, {
          type: "server",
          message: err instanceof Error ? err.message : "An error occurred",
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
      setValue("currentExercise.reps", "");
      setValue("currentExercise.weight", "");
      return;
    }
    const exerciseId = savedExercises.find((ex) => ex.name === val.value)?.id;
    if (!exerciseId) return;
    if (!user) return;
    try {
      const recentData = await fetchRecentExerciseData(user.id, exerciseId);
      setValue("currentExercise.reps", String(recentData.reps));
      setValue(
        "currentExercise.weight",
        recentData.weight ? String(recentData.weight) : ""
      );
    } catch (err) {
      // fail silently
    }
  };

  const exerciseSelectOptions = savedExercises.map((exercise) => ({
    label: exercise.name,
    value: exercise.name,
  }));
  return (
    <div className="workout-form">
      <h2>{existingWorkout ? "Edit Workout" : "New Workout"}</h2>
      {(errors as any).serverError && (
        <div className="error-message">
          {(errors as any).serverError.message}
        </div>
      )}
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <div className="date-input">
          <label htmlFor="workout-date">Workout Date:</label>
          <input
            type="date"
            id="workout-date"
            className="exercise-input-field"
            {...register("date")}
          />
        </div>
        <div className="instructor-checkbox">
          <label htmlFor="with-instructor">
            <input
              type="checkbox"
              id="with-instructor"
              {...register("withInstructor")}
            />
            With Instructor
          </label>
        </div>
        <div className="exercise-input">
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
                    field.onChange(val ? val.value : "");
                    handlePopulateRepsAndWeight(val);
                  }}
                  value={selectedExerciseOption}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
                />
              );
            }}
          />
          <input
            type="number"
            placeholder="Reps"
            min="1"
            className="exercise-input-field"
            {...register("currentExercise.reps")}
          />
          <input
            type="number"
            placeholder="Weight (lbs)"
            min="0"
            step="0.5"
            className="exercise-input-field"
            {...register("currentExercise.weight")}
          />
          <button
            type="button"
            onClick={addExercise}
            disabled={
              !currentExercise.name ||
              !currentExercise.reps ||
              isSavingExercise ||
              isSubmitting
            }
            className="add-exercise-btn"
          >
            {isSavingExercise ? "Adding..." : "Add Exercise"}
          </button>
        </div>

        <div className="exercise-list">
          <h3>Current Exercises:</h3>
          {fields.length === 0 ? (
            <p>No exercises added yet</p>
          ) : (
            <ul>
              {fields.map((field, index) => (
                <li key={field.id} className="exercise-item">
                  <div className="exercise-info">
                    {exercises[index].name} - {exercises[index].reps} reps
                    {exercises[index].weight
                      ? ` - ${exercises[index].weight} lbs`
                      : ""}
                  </div>
                  <button
                    type="button"
                    className="remove-exercise-btn"
                    onClick={() => remove(index)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          disabled={fields.length === 0 || isSubmitting}
          className="save-workout-btn"
        >
          {isSubmitting
            ? "Saving..."
            : existingWorkout
            ? "Update Workout"
            : "Save Workout"}
        </button>
      </form>
    </div>
  );
}

export default WorkoutForm;
