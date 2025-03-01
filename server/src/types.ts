import { Exercise, Workout, WorkoutExercise } from "./entities";

// Interface for API responses
export interface WorkoutResponse {
  id: number;
  date: string;
  withInstructor: boolean;
  exercises: Array<{
    id: number;
    name: string;
    reps: number;
  }>;
}

// Interface for workout creation request
export interface CreateWorkoutRequest {
  date: string;
  withInstructor: boolean;
  exercises: Array<{
    name: string;
    reps: number;
  }>;
}

export interface DatabaseError extends Error {
  code?: string;
  constraint?: string;
}
