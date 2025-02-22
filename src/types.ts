export interface Exercise {
  id?: number;
  name: string;
  reps: number;
}

export interface Workout {
  id?: number;
  date: string;
  exercises: Exercise[];
}

export interface WorkoutFormProps {
  onSubmit: (workout: Workout) => Promise<boolean>;
  savedExercises: string[];
  onSaveExercise: (exerciseName: string) => Promise<boolean>;
}

export interface WorkoutListProps {
  workouts: Workout[];
}

export interface Status {
  loading: boolean;
  error: string | null;
}
