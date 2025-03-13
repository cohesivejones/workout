import { Exercise, Workout, WorkoutExercise, User } from "./entities";

// Interface for API responses
export interface WorkoutResponse {
  id: number;
  date: string;
  withInstructor: boolean;
  exercises: Array<{
    id: number;
    name: string;
    reps: number;
    weight?: number | null;
  }>;
}

// Interface for workout creation request
export interface CreateWorkoutRequest {
  userId: number;
  date: string;
  withInstructor: boolean;
  exercises: Array<{
    name: string;
    reps: number;
    weight?: number | null;
  }>;
}

export interface DatabaseError extends Error {
  code?: string;
  constraint?: string;
}
