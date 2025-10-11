import axios from "axios";
import { Workout, Exercise, PainScore, SleepScore, User } from "./types";

// Auth types
export interface AuthResponse {
  user: User;
  token: string;
}

// Get token from localStorage if available
const token = localStorage.getItem("token");

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  withCredentials: true, // Include cookies in requests
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || "An error occurred");
  }
);

export const fetchWorkouts = (): Promise<Workout[]> => api.get(`/workouts`);

export const fetchExercises = (): Promise<Exercise[]> => api.get(`/exercises`);

export const createWorkout = (workout: Workout): Promise<Workout> => api.post("/workouts", workout);

export const createExercise = (exerciseName: string): Promise<Exercise> =>
  api.post("/exercises", { name: exerciseName });

export const updateExercise = (exerciseId: number, name: string): Promise<Exercise> =>
  api.put(`/exercises/${exerciseId}`, { name });

export const deleteWorkout = (workoutId: number): Promise<{ id: number }> =>
  api.delete(`/workouts/${workoutId}`);

export const updateWorkout = (workoutId: number, workout: Omit<Workout, "id">): Promise<Workout> =>
  api.put(`/workouts/${workoutId}`, workout);

export const fetchWorkout = (workoutId: number): Promise<Workout> =>
  api.get(`/workouts/${workoutId}`);

// Fetch the most recent workout exercise data for a given user and exercise name
export interface RecentExerciseData {
  reps: number;
  weight: number | null;
  time_minutes: number | null;
}

export const fetchRecentExerciseData = (exerciseId: number): Promise<RecentExerciseData> =>
  api.get(`/exercises/recent?exerciseId=${encodeURIComponent(exerciseId)}`);

// Pain Score API functions
export const fetchPainScores = (): Promise<PainScore[]> => api.get(`/pain-scores`);

export const fetchPainScore = (painScoreId: number): Promise<PainScore> =>
  api.get(`/pain-scores/${painScoreId}`);

export const createPainScore = (painScore: Omit<PainScore, "id">): Promise<PainScore> =>
  api.post("/pain-scores", painScore);

export const updatePainScore = (
  painScoreId: number,
  painScore: Omit<PainScore, "id">
): Promise<PainScore> => api.put(`/pain-scores/${painScoreId}`, painScore);

export const deletePainScore = (painScoreId: number): Promise<{ id: number }> =>
  api.delete(`/pain-scores/${painScoreId}`);

// Sleep Score API functions
export const fetchSleepScores = (): Promise<SleepScore[]> => api.get(`/sleep-scores`);

export const fetchSleepScore = (sleepScoreId: number): Promise<SleepScore> =>
  api.get(`/sleep-scores/${sleepScoreId}`);

export const createSleepScore = (sleepScore: Omit<SleepScore, "id">): Promise<SleepScore> =>
  api.post("/sleep-scores", sleepScore);

export const updateSleepScore = (
  sleepScoreId: number,
  sleepScore: Omit<SleepScore, "id">
): Promise<SleepScore> => api.put(`/sleep-scores/${sleepScoreId}`, sleepScore);

export const deleteSleepScore = (sleepScoreId: number): Promise<{ id: number }> =>
  api.delete(`/sleep-scores/${sleepScoreId}`);

// Auth API functions
export const getCurrentUser = (): Promise<User> => api.get("/auth/me");

export const login = (email: string, password: string): Promise<AuthResponse> => {
  return api.post("/auth/login", { email, password }).then((response) => {
    const authResponse = response as unknown as AuthResponse;
    // After successful login, store token
    localStorage.setItem("token", authResponse.token);

    // Configure axios for future requests
    api.defaults.headers.common["Authorization"] = `Bearer ${authResponse.token}`;

    return authResponse;
  });
};

export const logout = (): Promise<void> => {
  return api.post("/auth/logout", {}).then(() => {
    // Clear auth data
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
  });
};

// Diagnostician API functions
export interface DiagnosticData {
  workouts: {
    id: number;
    date: string;
    exercises: {
      name: string;
      reps: number;
      weight?: number | null;
    }[];
  }[];
  painScores: PainScore[];
  sleepScores: SleepScore[];
  dateRange: {
    start: string;
    end: string;
  };
}

// Fetch diagnostic data (last two months of workouts and pain scores)
export const fetchDiagnosticData = (): Promise<DiagnosticData> => api.get(`/diagnostics/data`);

// Send data to server for OpenAI analysis
export const analyzeDiagnosticData = (
  diagnosticData: DiagnosticData
): Promise<{ analysis: string }> => api.post("/diagnostics/analyze", { diagnosticData });

// Dashboard data types
export interface ExerciseWeightDataPoint {
  date: string;
  weight: number | null;
  reps: number;
  new_reps?: boolean;
  new_weight?: boolean;
}

export interface ExerciseWeightProgression {
  exerciseName: string;
  dataPoints: ExerciseWeightDataPoint[];
}

export interface PainScoreDataPoint {
  date: string;
  score: number;
}

export interface PainScoreProgression {
  dataPoints: PainScoreDataPoint[];
}

export interface SleepScoreDataPoint {
  date: string;
  score: number;
}

export interface SleepScoreProgression {
  dataPoints: SleepScoreDataPoint[];
}

// Fetch exercise weight progression data for dashboard
export const fetchWeightProgressionData = (): Promise<ExerciseWeightProgression[]> =>
  api.get("/dashboard/weight-progression");

// Fetch pain score progression data for dashboard
export const fetchPainProgressionData = (): Promise<PainScoreProgression> =>
  api.get("/dashboard/pain-progression");

// Fetch sleep score progression data for dashboard
export const fetchSleepProgressionData = (): Promise<SleepScoreProgression> =>
  api.get("/dashboard/sleep-progression");

// Generate workout API functions
export interface GenerateWorkoutRequest {
  additionalNotes?: string;
}

export interface GenerateWorkoutResponse {
  generatedWorkout: string;
}

export const generateWorkout = (
  request: GenerateWorkoutRequest
): Promise<GenerateWorkoutResponse> => api.post("/workouts/generate", request);
