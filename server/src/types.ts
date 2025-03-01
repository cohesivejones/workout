import { Exercise, Workout, WorkoutExercise } from "./entities";

// Interface for API responses
export interface WorkoutResponse {
  id: number;
  date: string;
  exercises: Array<{
    id: number;
    name: string;
    reps: number;
  }>;
}

// Interface for workout creation request
export interface CreateWorkoutRequest {
  date: string;
  exercises: Array<{
    name: string;
    reps: number;
  }>;
}

export interface DatabaseError extends Error {
  code?: string;
  constraint?: string;
}
