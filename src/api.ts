import axios from "axios";
import { Workout, User, Exercise } from "./types";

const api = axios.create({
  baseURL: process.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || "An error occurred");
  }
);

export const fetchUsers = (): Promise<User[]> => api.get("/users");

export const fetchWorkouts = (userId: number): Promise<Workout[]> =>
  api.get(`/workouts?userId=${userId}`);

export const fetchExercises = (userId: number): Promise<Exercise[]> =>
  api.get(`/exercises?userId=${userId}`);

export const createWorkout = (workout: Workout): Promise<Workout> =>
  api.post("/workouts", workout);

export const createExercise = (
  exerciseName: string,
  userId: number
): Promise<Exercise> => api.post("/exercises", { name: exerciseName, userId });

export const deleteWorkout = (workoutId: number): Promise<{ id: number }> =>
  api.delete(`/workouts/${workoutId}`);

export const updateWorkout = (
  workoutId: number,
  workout: Omit<Workout, "id">
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
  exerciseId: number
): Promise<RecentExerciseData> =>
  api.get(
    `/exercises/recent?userId=${userId}&exerciseId=${encodeURIComponent(
      exerciseId
    )}`
  );
