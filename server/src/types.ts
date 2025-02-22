export interface Exercise {
  id: number;
  name: string;
}

export interface Workout {
  id: number;
  date: string;
  exercises: Array<Exercise & { reps: number }>;
}

export interface WorkoutExercise {
  workout_id: number;
  exercise_id: number;
  reps: number;
}

export interface DatabaseError extends Error {
  code?: string;
  constraint?: string;
}
