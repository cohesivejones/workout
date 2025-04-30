export interface User {
  id: number;
  name: string;
}

export interface UserListProps {
  users: User[];
}

export interface PainScore {
  id: number;
  userId: number;
  date: string;
  score: number;
  notes?: string | null;
}

export interface SleepScore {
  id: number;
  userId: number;
  date: string;
  score: number;
  notes?: string | null;
}

export interface WorkoutExercise {
  id?: number;
  name: string;
  reps: number;
  weight?: number | null;
  new_reps?: boolean;
  new_weight?: boolean;
}

export interface Exercise {
  id: number;
  userId: number;
  name: string;
}

export interface Workout {
  id: number;
  date: string;
  userId: number;
  withInstructor: boolean;
  exercises: WorkoutExercise[];
}

export interface WorkoutFormProps {
  onSubmit: (workout: Omit<Workout, "id">) => Promise<boolean>;
  savedExercises: Exercise[];
  onSaveExercise: (exerciseName: string) => Promise<boolean>;
  existingWorkout?: Workout;
  onCancel?: () => void;
}

export interface WorkoutListProps {
  workouts: Workout[];
  onWorkoutDeleted: (workoutId: number) => void;
}
