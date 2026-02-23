import { Workout, PainScore, SleepScore } from '../types';

export function toHomePath() {
  return '/';
}

export function toWorkoutPath(workout: Workout) {
  return `/workouts/${workout.id}`;
}

export function toWorkoutNewPath() {
  return '/workouts/new';
}

export function toWorkoutEditPath(workout: Workout) {
  return `/workouts/${workout.id}/edit`;
}

export function toPainScoreNewPath(date?: string) {
  return date ? `/pain-scores/new?date=${date}` : '/pain-scores/new';
}

export function toPainScoreEditPath(painScore: PainScore) {
  return `/pain-scores/${painScore.id}/edit`;
}

export function toSleepScoreNewPath(date?: string) {
  return date ? `/sleep-scores/new?date=${date}` : '/sleep-scores/new';
}

export function toSleepScoreEditPath(sleepScore: SleepScore) {
  return `/sleep-scores/${sleepScore.id}/edit`;
}

export function toExerciseProgressionPath(exerciseId: number) {
  return `/exercises/${exerciseId}/progression`;
}
