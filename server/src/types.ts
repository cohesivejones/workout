import {
  Exercise,
  Workout,
  WorkoutExercise,
  User,
  PainScore,
} from "./entities";

// Authentication interfaces
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

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

// Pain score interfaces
export interface PainScoreResponse {
  id: number;
  userId: number;
  date: string;
  score: number;
  notes: string | null;
}

export interface CreatePainScoreRequest {
  userId: number;
  date: string;
  score: number;
  notes?: string | null;
}

export interface DatabaseError extends Error {
  code?: string;
  constraint?: string;
}
