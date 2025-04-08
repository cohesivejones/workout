import axios from "axios";
import { Workout, Exercise, PainScore, User } from "./types";

// Auth types
export interface AuthResponse {
  user: User;
  token: string;
}

// Get token from localStorage if available
const token = localStorage.getItem("token");

const api = axios.create({
  baseURL: process.env.VITE_API_URL,
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
  },
);

export const fetchWorkouts = (userId: number): Promise<Workout[]> =>
  api.get(`/workouts?userId=${userId}`);

export const fetchExercises = (userId: number): Promise<Exercise[]> =>
  api.get(`/exercises?userId=${userId}`);

export const createWorkout = (workout: Workout): Promise<Workout> =>
  api.post("/workouts", workout);

export const createExercise = (
  exerciseName: string,
  userId: number,
): Promise<Exercise> => api.post("/exercises", { name: exerciseName, userId });

export const updateExercise = (
  exerciseId: number,
  name: string,
): Promise<Exercise> => api.put(`/exercises/${exerciseId}`, { name });

export const deleteWorkout = (workoutId: number): Promise<{ id: number }> =>
  api.delete(`/workouts/${workoutId}`);

export const updateWorkout = (
  workoutId: number,
  workout: Omit<Workout, "id">,
): Promise<Workout> => api.put(`/workouts/${workoutId}`, workout);

export const fetchWorkout = (workoutId: number): Promise<Workout> =>
  api.get(`/workouts/${workoutId}`);

// Fetch the most recent workout exercise data for a given user and exercise name
export interface RecentExerciseData {
  reps: number;
  weight: number | null;
}

export const fetchRecentExerciseData = (
  userId: number,
  exerciseId: number,
): Promise<RecentExerciseData> =>
  api.get(
    `/exercises/recent?userId=${userId}&exerciseId=${encodeURIComponent(
      exerciseId,
    )}`,
  );

// Pain Score API functions
export const fetchPainScores = (userId: number): Promise<PainScore[]> =>
  api.get(`/pain-scores?userId=${userId}`);

export const fetchPainScore = (painScoreId: number): Promise<PainScore> =>
  api.get(`/pain-scores/${painScoreId}`);

export const createPainScore = (
  painScore: Omit<PainScore, "id">,
): Promise<PainScore> => api.post("/pain-scores", painScore);

export const updatePainScore = (
  painScoreId: number,
  painScore: Omit<PainScore, "id">,
): Promise<PainScore> => api.put(`/pain-scores/${painScoreId}`, painScore);

export const deletePainScore = (painScoreId: number): Promise<{ id: number }> =>
  api.delete(`/pain-scores/${painScoreId}`);

// Auth API functions
export const getCurrentUser = (): Promise<User> => 
  api.get('/auth/me');

export const login = (email: string, password: string): Promise<AuthResponse> => {
  return api.post('/auth/login', { email, password }).then((response: any) => {
    // After successful login, store token
    localStorage.setItem("token", response.token);
    
    // Configure axios for future requests
    api.defaults.headers.common["Authorization"] = `Bearer ${response.token}`;
    
    return response as AuthResponse;
  });
};

export const logout = (): Promise<void> => {
  return api.post('/auth/logout', {}).then(() => {
    // Clear auth data
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
  });
};
