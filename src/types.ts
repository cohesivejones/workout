export interface Exercise {
  id?: number;
  name: string;
  reps: number;
  weight?: number | null;
}

export interface Workout {
  id: number;
  date: string;
  withInstructor: boolean;
  exercises: Exercise[];
}

export interface WorkoutFormProps {
  onSubmit: (workout: Omit<Workout, 'id'>) => Promise<boolean>;
  savedExercises: string[];
  onSaveExercise: (exerciseName: string) => Promise<boolean>;
  existingWorkout?: Workout;
}

export interface WorkoutListProps {
  workouts: Workout[];
  onWorkoutDeleted: (workoutId: number) => void;
}

export interface Status {
  loading: boolean;
  error: string | null;
}
