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
    time_seconds?: number | null;
    newReps?: boolean;
    newWeight?: boolean;
    newTime?: boolean;
  }>;
}

// Interface for workout creation request
export interface CreateWorkoutRequest {
  date: string;
  withInstructor: boolean;
  exercises: Array<{
    name: string;
    reps: number;
    weight?: number | null;
    time_seconds?: number | null;
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
  date: string;
  score: number;
  notes?: string | null;
}

// Sleep score interfaces
export interface SleepScoreResponse {
  id: number;
  userId: number;
  date: string;
  score: number;
  notes: string | null;
}

export interface CreateSleepScoreRequest {
  date: string;
  score: number;
  notes?: string | null;
}

export interface DatabaseError extends Error {
  code?: string;
  constraint?: string;
}
