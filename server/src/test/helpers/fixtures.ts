import dataSource from '../../data-source';
import { Workout, Exercise, WorkoutExercise, PainScore, SleepScore } from '../../entities';

/**
 * Creates a test workout for a user
 */
export async function createTestWorkout(userId: number, data?: Partial<Workout>): Promise<Workout> {
  const workoutRepository = dataSource.getRepository(Workout);

  const workout = workoutRepository.create({
    userId,
    date: data?.date || new Date().toISOString().split('T')[0],
    withInstructor: data?.withInstructor ?? false,
    ...data,
  });

  return await workoutRepository.save(workout);
}

/**
 * Creates a test exercise for a user
 */
export async function createTestExercise(userId: number, name: string): Promise<Exercise> {
  const exerciseRepository = dataSource.getRepository(Exercise);

  // Check if exercise already exists for this user (exercises have unique constraint on name+userId)
  const existingExercise = await exerciseRepository.findOne({
    where: { name, userId },
  });

  if (existingExercise) {
    return existingExercise;
  }

  // Create new exercise if it doesn't exist
  const exercise = exerciseRepository.create({
    name,
    userId,
  });

  return await exerciseRepository.save(exercise);
}

/**
 * Creates a workout exercise relationship
 */
export async function createTestWorkoutExercise(
  workoutId: number,
  exerciseId: number,
  data?: Partial<WorkoutExercise>
): Promise<WorkoutExercise> {
  const workoutExerciseRepository = dataSource.getRepository(WorkoutExercise);

  const workoutExercise = workoutExerciseRepository.create({
    workout_id: workoutId,
    exercise_id: exerciseId,
    reps: data?.reps || 10,
    weight: data?.weight ?? null,
    time_seconds: data?.time_seconds ?? null,
    new_reps: data?.new_reps ?? false,
    new_weight: data?.new_weight ?? false,
    new_time: data?.new_time ?? false,
    ...data,
  });

  return await workoutExerciseRepository.save(workoutExercise);
}

/**
 * Creates a test pain score for a user
 */
export async function createTestPainScore(
  userId: number,
  data?: Partial<PainScore>
): Promise<PainScore> {
  const painScoreRepository = dataSource.getRepository(PainScore);

  const painScore = painScoreRepository.create({
    userId,
    date: data?.date || new Date().toISOString().split('T')[0],
    score: data?.score ?? 5,
    notes: data?.notes ?? null,
    ...data,
  });

  return await painScoreRepository.save(painScore);
}

/**
 * Creates a test sleep score for a user
 */
export async function createTestSleepScore(
  userId: number,
  data?: Partial<SleepScore>
): Promise<SleepScore> {
  const sleepScoreRepository = dataSource.getRepository(SleepScore);

  const sleepScore = sleepScoreRepository.create({
    userId,
    date: data?.date || new Date().toISOString().split('T')[0],
    score: data?.score ?? 3,
    notes: data?.notes ?? null,
    ...data,
  });

  return await sleepScoreRepository.save(sleepScore);
}

/**
 * Creates a complete workout with exercises
 */
export async function createTestWorkoutWithExercises(
  userId: number,
  workoutData?: Partial<Workout>,
  exercises?: Array<{ name: string; reps?: number; weight?: number; time_seconds?: number }>
): Promise<{ workout: Workout; exercises: Exercise[] }> {
  const workout = await createTestWorkout(userId, workoutData);

  const exerciseData = exercises || [
    { name: 'Squats', reps: 10, weight: 100 },
    { name: 'Bench Press', reps: 10, weight: 135 },
  ];

  const createdExercises: Exercise[] = [];

  for (const exerciseInfo of exerciseData) {
    const exercise = await createTestExercise(userId, exerciseInfo.name);
    await createTestWorkoutExercise(workout.id, exercise.id, {
      reps: exerciseInfo.reps,
      weight: exerciseInfo.weight,
      time_seconds: exerciseInfo.time_seconds,
    });
    createdExercises.push(exercise);
  }

  return { workout, exercises: createdExercises };
}
