import { Workout } from "../types";

export function toHomePath() {
  return "/";
}

export function toWorkoutPath(workout: Workout) {
  return `/workouts/${workout.id}`;
}

export function toWorkoutNewPath() {
  return "/workouts/new";
}

export function toWorkoutEditPath(workout: Workout) {
  return `/workouts/${workout.id}/edit`;
}
