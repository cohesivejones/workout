export interface User {
  id: number;
  name: string;
}

export interface UserListProps {
  users: User[];
}

export interface PainScore {
  id: number;
  userId?: number;
  date: string;
  score: number;
  notes?: string | null;
}

export interface SleepScore {
  id: number;
  userId?: number;
  date: string;
  score: number;
  notes?: string | null;
}

export interface WorkoutExercise {
  id?: number;
  name: string;
  reps: number;
  weight?: number | null;
  time_seconds?: number | null;
  newReps?: boolean;
  newWeight?: boolean;
  newTime?: boolean;
}

export interface Exercise {
  id: number;
  userId: number;
  name: string;
}

export interface Workout {
  id: number;
  date: string;
  userId?: number;
  withInstructor: boolean;
  exercises: WorkoutExercise[];
}

export interface WorkoutFormProps {
  onSubmit: (workout: Omit<Workout, 'id'>) => Promise<boolean>;
  savedExercises: Exercise[];
  onSaveExercise: (exerciseName: string) => Promise<boolean>;
  existingWorkout?: Workout;
  onCancel?: () => void;
}

export interface WorkoutListProps {
  workouts: Workout[];
  onWorkoutDeleted: (workoutId: number) => void;
}

export interface TimelineResponse {
  workouts: Workout[];
  painScores: PainScore[];
  sleepScores: SleepScore[];
  hasMore: boolean;
}

export type ActivityItemType = 'workout' | 'painScore' | 'sleepScore';

export interface ActivityItem {
  type: ActivityItemType;
  id: number;
  date: string;
  workout?: Workout;
  painScore?: PainScore;
  sleepScore?: SleepScore;
}

export interface ActivityResponse {
  items: ActivityItem[];
  total: number;
  offset: number;
  month: string | null;
}
