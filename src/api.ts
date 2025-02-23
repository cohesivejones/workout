import axios from "axios";
import { Exercise, Workout } from "./types";

const api = axios.create({
  baseURL: `${process.env.VITE_API_URL}/api`,
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

export const fetchWorkouts = (): Promise<Workout[]> => api.get("/workouts");

export const fetchExercises = (): Promise<Exercise[]> => api.get("/exercises");

export const createWorkout = (workout: Workout): Promise<Workout> =>
  api.post("/workouts", workout);

export const createExercise = (exerciseName: string): Promise<Exercise> =>
  api.post("/exercises", { name: exerciseName });

export const deleteWorkout = (workoutId: number): Promise<{ id: number }> =>
  api.delete(`/workouts/${workoutId}`);
