import { Workout, PainScore } from "../types";

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

export function toPainScoreNewPath() {
  return "/pain-scores/new";
}

export function toPainScoreEditPath(painScore: PainScore) {
  return `/pain-scores/${painScore.id}/edit`;
}
