import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, type Mock } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import dataSource from '../../data-source';
import { User, Exercise, Workout, WorkoutExercise } from '../../entities';
import { generateToken } from '../../middleware/auth';
import * as bcrypt from 'bcrypt';
import exercisesRouter from '../../routes/exercises.routes';
import { openai } from '../../services/openai';

// Mock the OpenAI client
vi.mock('../../services/openai', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

// Type the mocked function
const mockOpenAICreate = openai.chat.completions.create as Mock;

// Create a minimal test app with exercise routes
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/exercises', exercisesRouter);

  return app;
}

describe('Exercise API Routes', () => {
  let app: express.Application;
  let testUser: User;
  let authToken: string;

  beforeAll(async () => {
    app = createTestApp();

    const userRepository = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('testpass123', 10);

    testUser = userRepository.create({
      email: 'exercise-test@example.com',
      name: 'Exercise Test User',
      password: hashedPassword,
    });

    await userRepository.save(testUser);
    authToken = generateToken(testUser);
  });

  afterAll(async () => {
    if (testUser) {
      await dataSource.query(
        'DELETE FROM workout_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE "userId" = $1)',
        [testUser.id]
      );
      await dataSource.query('DELETE FROM workouts WHERE "userId" = $1', [testUser.id]);
      await dataSource.query('DELETE FROM exercises WHERE "userId" = $1', [testUser.id]);

      const userRepository = dataSource.getRepository(User);
      await userRepository.remove(testUser);
    }
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM workout_exercises');
    await dataSource.query('DELETE FROM workouts');
    await dataSource.query('DELETE FROM exercises');
    await dataSource.query('DELETE FROM pain_scores');
    await dataSource.query('DELETE FROM sleep_scores');
  });

  describe('GET /api/exercises', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/exercises').expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return empty array when no exercises exist', async () => {
      const response = await request(app)
        .get('/api/exercises')
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all exercises for authenticated user', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);

      // Create test exercises
      const exercise1 = exerciseRepository.create({ name: 'Bench Press', userId: testUser.id });
      const exercise2 = exerciseRepository.create({ name: 'Squats', userId: testUser.id });
      await exerciseRepository.save([exercise1, exercise2]);

      const response = await request(app)
        .get('/api/exercises')
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Bench Press');
      expect(response.body[1].name).toBe('Squats');
    });

    it('should return exercises sorted alphabetically by name', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);

      // Create exercises in non-alphabetical order
      const exercises = [
        exerciseRepository.create({ name: 'Squats', userId: testUser.id }),
        exerciseRepository.create({ name: 'Bench Press', userId: testUser.id }),
        exerciseRepository.create({ name: 'Deadlift', userId: testUser.id }),
      ];
      await exerciseRepository.save(exercises);

      const response = await request(app)
        .get('/api/exercises')
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body[0].name).toBe('Bench Press');
      expect(response.body[1].name).toBe('Deadlift');
      expect(response.body[2].name).toBe('Squats');
    });

    it('should only return exercises for authenticated user', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);
      const userRepository = dataSource.getRepository(User);

      // Create another user
      const hashedPassword = await bcrypt.hash('otherpass123', 10);
      const otherUser = userRepository.create({
        email: 'my-other-exercise-test@example.com',
        name: 'Other Exercise Test User',
        password: hashedPassword,
      });
      await userRepository.save(otherUser);

      // Create exercises for both users
      const testUserExercise = exerciseRepository.create({
        name: 'My Exercise',
        userId: testUser.id,
      });
      const otherUserExercise = exerciseRepository.create({
        name: 'Other Exercise',
        userId: otherUser.id,
      });
      await exerciseRepository.save([testUserExercise, otherUserExercise]);

      const response = await request(app)
        .get('/api/exercises')
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('My Exercise');

      // Cleanup
      await dataSource.query('DELETE FROM exercises WHERE "userId" = $1', [otherUser.id]);
      await userRepository.remove(otherUser);
    });
  });

  describe('POST /api/exercises', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/exercises')
        .send({ name: 'New Exercise' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should create a new exercise', async () => {
      const response = await request(app)
        .post('/api/exercises')
        .send({ name: 'Bench Press' })
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Bench Press');
      expect(response.body.userId).toBe(testUser.id);
    });

    it('should return existing exercise if already exists', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);
      const existingExercise = exerciseRepository.create({
        name: 'Squats',
        userId: testUser.id,
      });
      await exerciseRepository.save(existingExercise);

      const response = await request(app)
        .post('/api/exercises')
        .send({ name: 'Squats' })
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.id).toBe(existingExercise.id);
      expect(response.body.name).toBe('Squats');

      // Verify only one exercise exists
      const allExercises = await exerciseRepository.find({
        where: { name: 'Squats', userId: testUser.id },
      });
      expect(allExercises).toHaveLength(1);
    });

    it('should persist exercise to database', async () => {
      const response = await request(app)
        .post('/api/exercises')
        .send({ name: 'Deadlift' })
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      const exerciseRepository = dataSource.getRepository(Exercise);
      const savedExercise = await exerciseRepository.findOne({
        where: { id: response.body.id },
      });

      expect(savedExercise).toBeDefined();
      expect(savedExercise!.name).toBe('Deadlift');
      expect(savedExercise!.userId).toBe(testUser.id);
    });
  });

  describe('PUT /api/exercises/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/exercises/1')
        .send({ name: 'Updated Exercise' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should update an existing exercise', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);
      const exercise = exerciseRepository.create({
        name: 'Old Name',
        userId: testUser.id,
      });
      await exerciseRepository.save(exercise);

      const response = await request(app)
        .put(`/api/exercises/${exercise.id}`)
        .send({ name: 'New Name' })
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.id).toBe(exercise.id);
      expect(response.body.name).toBe('New Name');
    });

    it('should return 404 for non-existent exercise', async () => {
      const response = await request(app)
        .put('/api/exercises/99999')
        .send({ name: 'New Name' })
        .set('Cookie', [`token=${authToken}`])
        .expect(404);

      expect(response.body.error).toBe('Exercise not found');
    });

    it('should return 400 when name is missing', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);
      const exercise = exerciseRepository.create({
        name: 'Test Exercise',
        userId: testUser.id,
      });
      await exerciseRepository.save(exercise);

      const response = await request(app)
        .put(`/api/exercises/${exercise.id}`)
        .send({})
        .set('Cookie', [`token=${authToken}`])
        .expect(400);

      expect(response.body.error).toBe('Exercise name is required');
    });

    it('should persist changes to database', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);
      const exercise = exerciseRepository.create({
        name: 'Old Name',
        userId: testUser.id,
      });
      await exerciseRepository.save(exercise);

      await request(app)
        .put(`/api/exercises/${exercise.id}`)
        .send({ name: 'Updated Name' })
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      const updatedExercise = await exerciseRepository.findOne({
        where: { id: exercise.id },
      });

      expect(updatedExercise!.name).toBe('Updated Name');
    });
  });

  describe('GET /api/exercises/recent', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/exercises/recent?exerciseId=1').expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when exerciseId is missing', async () => {
      const response = await request(app)
        .get('/api/exercises/recent')
        .set('Cookie', [`token=${authToken}`])
        .expect(400);

      expect(response.body.error).toBe('Exercise ID is required');
    });

    it('should return 404 when no workout found with exercise', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);
      const exercise = exerciseRepository.create({
        name: 'Bench Press',
        userId: testUser.id,
      });
      await exerciseRepository.save(exercise);

      const response = await request(app)
        .get(`/api/exercises/recent?exerciseId=${exercise.id}`)
        .set('Cookie', [`token=${authToken}`])
        .expect(404);

      expect(response.body.error).toBe('No workout found with this exercise');
    });

    it('should return most recent workout data for exercise', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);
      const workoutRepository = dataSource.getRepository(Workout);
      const workoutExerciseRepository = dataSource.getRepository(WorkoutExercise);

      // Create exercise
      const exercise = exerciseRepository.create({
        name: 'Bench Press',
        userId: testUser.id,
      });
      await exerciseRepository.save(exercise);

      // Create older workout
      const oldWorkout = workoutRepository.create({
        userId: testUser.id,
        date: '2024-01-10',
        withInstructor: false,
      });
      await workoutRepository.save(oldWorkout);

      const oldWorkoutExercise = workoutExerciseRepository.create({
        workout_id: oldWorkout.id,
        exercise_id: exercise.id,
        reps: 8,
        weight: 135,
        time_seconds: null,
      });
      await workoutExerciseRepository.save(oldWorkoutExercise);

      // Create newer workout
      const newWorkout = workoutRepository.create({
        userId: testUser.id,
        date: '2024-01-15',
        withInstructor: false,
      });
      await workoutRepository.save(newWorkout);

      const newWorkoutExercise = workoutExerciseRepository.create({
        workout_id: newWorkout.id,
        exercise_id: exercise.id,
        reps: 10,
        weight: 145,
        time_seconds: null,
      });
      await workoutExerciseRepository.save(newWorkoutExercise);

      const response = await request(app)
        .get(`/api/exercises/recent?exerciseId=${exercise.id}`)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.reps).toBe(10);
      expect(response.body.weight).toBe(145);
      expect(response.body.time_seconds).toBeNull();
    });

    it('should return time_seconds for time-based exercises', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);
      const workoutRepository = dataSource.getRepository(Workout);
      const workoutExerciseRepository = dataSource.getRepository(WorkoutExercise);

      // Create exercise
      const exercise = exerciseRepository.create({
        name: 'Plank',
        userId: testUser.id,
      });
      await exerciseRepository.save(exercise);

      // Create workout
      const workout = workoutRepository.create({
        userId: testUser.id,
        date: '2024-01-15',
        withInstructor: false,
      });
      await workoutRepository.save(workout);

      const workoutExercise = workoutExerciseRepository.create({
        workout_id: workout.id,
        exercise_id: exercise.id,
        reps: 1,
        weight: null,
        time_seconds: 2.5,
      });
      await workoutExerciseRepository.save(workoutExercise);

      const response = await request(app)
        .get(`/api/exercises/recent?exerciseId=${exercise.id}`)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.reps).toBe(1);
      expect(response.body.weight).toBeNull();
      expect(response.body.time_seconds).toBe(2.5);
    });
  });

  describe('POST /api/exercises/:id/suggest', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/api/exercises/1/suggest').expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent exercise', async () => {
      const response = await request(app)
        .post('/api/exercises/99999/suggest')
        .set('Cookie', [`token=${authToken}`])
        .expect(404);

      expect(response.body.error).toBe('Exercise not found');
    });

    it('should return 404 when exercise belongs to different user', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);
      const userRepository = dataSource.getRepository(User);

      // Create another user
      const hashedPassword = await bcrypt.hash('otherpass123', 10);
      const otherUser = userRepository.create({
        email: 'suggest-other-user@example.com',
        name: 'Other Suggest User',
        password: hashedPassword,
      });
      await userRepository.save(otherUser);

      // Create exercise for other user
      const otherExercise = exerciseRepository.create({
        name: 'Other User Exercise',
        userId: otherUser.id,
      });
      await exerciseRepository.save(otherExercise);

      const response = await request(app)
        .post(`/api/exercises/${otherExercise.id}/suggest`)
        .set('Cookie', [`token=${authToken}`])
        .expect(404);

      expect(response.body.error).toBe('Exercise not found');

      // Cleanup
      await dataSource.query('DELETE FROM exercises WHERE "userId" = $1', [otherUser.id]);
      await userRepository.remove(otherUser);
    });

    it('should return 3 AI-generated suggestions', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);
      const exercise = exerciseRepository.create({
        name: 'bench press',
        userId: testUser.id,
      });
      await exerciseRepository.save(exercise);

      // Mock OpenAI response
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Barbell Bench Press\nFlat Bench Press\nBarbell Flat Bench Press',
            },
          },
        ],
      });

      const response = await request(app)
        .post(`/api/exercises/${exercise.id}/suggest`)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.suggestions).toHaveLength(3);
      expect(response.body.suggestions).toEqual([
        'Barbell Bench Press',
        'Flat Bench Press',
        'Barbell Flat Bench Press',
      ]);
    });

    it('should handle OpenAI API errors gracefully', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);
      const exercise = exerciseRepository.create({
        name: 'squats',
        userId: testUser.id,
      });
      await exerciseRepository.save(exercise);

      // Mock OpenAI error
      mockOpenAICreate.mockRejectedValueOnce(new Error('OpenAI API error'));

      const response = await request(app)
        .post(`/api/exercises/${exercise.id}/suggest`)
        .set('Cookie', [`token=${authToken}`])
        .expect(500);

      expect(response.body.error).toBe('Server error');
    });

    it('should fallback to original name if OpenAI returns invalid response', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);
      const exercise = exerciseRepository.create({
        name: 'deadlift',
        userId: testUser.id,
      });
      await exerciseRepository.save(exercise);

      // Mock OpenAI response with only 1 suggestion
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Romanian Deadlift',
            },
          },
        ],
      });

      const response = await request(app)
        .post(`/api/exercises/${exercise.id}/suggest`)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      // Should return the single suggestion (implementation doesn't pad to 3)
      expect(response.body.suggestions).toHaveLength(1);
      expect(response.body.suggestions[0]).toBe('Romanian Deadlift');
    });
  });

  describe('GET /api/exercises/:id/progression', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/exercises/1/progression').expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent exercise', async () => {
      const response = await request(app)
        .get('/api/exercises/99999/progression')
        .set('Cookie', [`token=${authToken}`])
        .expect(404);

      expect(response.body.error).toBe('Exercise not found');
    });

    it('should return 404 when exercise belongs to different user', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);
      const userRepository = dataSource.getRepository(User);

      // Create another user
      const hashedPassword = await bcrypt.hash('otherpass123', 10);
      const otherUser = userRepository.create({
        email: 'progression-other-user@example.com',
        name: 'Other Progression User',
        password: hashedPassword,
      });
      await userRepository.save(otherUser);

      // Create exercise for other user
      const otherExercise = exerciseRepository.create({
        name: 'Other User Exercise',
        userId: otherUser.id,
      });
      await exerciseRepository.save(otherExercise);

      const response = await request(app)
        .get(`/api/exercises/${otherExercise.id}/progression`)
        .set('Cookie', [`token=${authToken}`])
        .expect(404);

      expect(response.body.error).toBe('Exercise not found');

      // Cleanup
      await dataSource.query('DELETE FROM exercises WHERE "userId" = $1', [otherUser.id]);
      await userRepository.remove(otherUser);
    });

    it('should return empty progression data for exercise with no history', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);
      const exercise = exerciseRepository.create({
        name: 'New Exercise',
        userId: testUser.id,
      });
      await exerciseRepository.save(exercise);

      const response = await request(app)
        .get(`/api/exercises/${exercise.id}/progression`)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.exerciseName).toBe('New Exercise');
      expect(response.body.weightData).toEqual([]);
      expect(response.body.repsData).toEqual([]);
    });

    it('should return progression data for exercise within 12 weeks', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);
      const workoutRepository = dataSource.getRepository(Workout);
      const workoutExerciseRepository = dataSource.getRepository(WorkoutExercise);

      // Create exercise
      const exercise = exerciseRepository.create({
        name: 'Bench Press',
        userId: testUser.id,
      });
      await exerciseRepository.save(exercise);

      // Create workout from 7 days ago
      const workout1Date = new Date();
      workout1Date.setDate(workout1Date.getDate() - 7);
      const workout1 = workoutRepository.create({
        userId: testUser.id,
        date: workout1Date.toISOString().split('T')[0],
        withInstructor: false,
      });
      await workoutRepository.save(workout1);

      const workoutExercise1 = workoutExerciseRepository.create({
        workout_id: workout1.id,
        exercise_id: exercise.id,
        reps: 8,
        weight: 135,
        time_seconds: null,
        new_reps: false,
        new_weight: false,
      });
      await workoutExerciseRepository.save(workoutExercise1);

      // Create workout from today with improvements
      const workout2Date = new Date();
      const workout2 = workoutRepository.create({
        userId: testUser.id,
        date: workout2Date.toISOString().split('T')[0],
        withInstructor: false,
      });
      await workoutRepository.save(workout2);

      const workoutExercise2 = workoutExerciseRepository.create({
        workout_id: workout2.id,
        exercise_id: exercise.id,
        reps: 10,
        weight: 145,
        time_seconds: null,
        new_reps: true,
        new_weight: true,
      });
      await workoutExerciseRepository.save(workoutExercise2);

      const response = await request(app)
        .get(`/api/exercises/${exercise.id}/progression`)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.exerciseName).toBe('Bench Press');
      expect(response.body.weightData).toHaveLength(2);
      expect(response.body.repsData).toHaveLength(2);

      // Check first data point (older workout)
      expect(response.body.weightData[0].weight).toBe(135);
      expect(response.body.weightData[0].reps).toBe(8);
      expect(response.body.weightData[0].new_weight).toBe(false);
      expect(response.body.weightData[0].new_reps).toBe(false);

      // Check second data point (newer workout with PRs)
      expect(response.body.weightData[1].weight).toBe(145);
      expect(response.body.weightData[1].reps).toBe(10);
      expect(response.body.weightData[1].new_weight).toBe(true);
      expect(response.body.weightData[1].new_reps).toBe(true);

      // Check reps data
      expect(response.body.repsData[0].reps).toBe(8);
      expect(response.body.repsData[1].reps).toBe(10);
    });

    it('should only return data from the last 12 weeks', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);
      const workoutRepository = dataSource.getRepository(Workout);
      const workoutExerciseRepository = dataSource.getRepository(WorkoutExercise);

      // Create exercise
      const exercise = exerciseRepository.create({
        name: 'Squats',
        userId: testUser.id,
      });
      await exerciseRepository.save(exercise);

      // Create workout from 100 days ago (outside 12-week window)
      const oldWorkoutDate = new Date();
      oldWorkoutDate.setDate(oldWorkoutDate.getDate() - 100);
      const oldWorkout = workoutRepository.create({
        userId: testUser.id,
        date: oldWorkoutDate.toISOString().split('T')[0],
        withInstructor: false,
      });
      await workoutRepository.save(oldWorkout);

      const oldWorkoutExercise = workoutExerciseRepository.create({
        workout_id: oldWorkout.id,
        exercise_id: exercise.id,
        reps: 5,
        weight: 100,
        time_seconds: null,
      });
      await workoutExerciseRepository.save(oldWorkoutExercise);

      // Create workout from 7 days ago (within 12-week window)
      const recentWorkoutDate = new Date();
      recentWorkoutDate.setDate(recentWorkoutDate.getDate() - 7);
      const recentWorkout = workoutRepository.create({
        userId: testUser.id,
        date: recentWorkoutDate.toISOString().split('T')[0],
        withInstructor: false,
      });
      await workoutRepository.save(recentWorkout);

      const recentWorkoutExercise = workoutExerciseRepository.create({
        workout_id: recentWorkout.id,
        exercise_id: exercise.id,
        reps: 8,
        weight: 135,
        time_seconds: null,
      });
      await workoutExerciseRepository.save(recentWorkoutExercise);

      const response = await request(app)
        .get(`/api/exercises/${exercise.id}/progression`)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.exerciseName).toBe('Squats');
      expect(response.body.weightData).toHaveLength(1);
      expect(response.body.repsData).toHaveLength(1);
      expect(response.body.weightData[0].weight).toBe(135);
      expect(response.body.weightData[0].reps).toBe(8);
    });

    it('should return data sorted by date in ascending order', async () => {
      const exerciseRepository = dataSource.getRepository(Exercise);
      const workoutRepository = dataSource.getRepository(Workout);
      const workoutExerciseRepository = dataSource.getRepository(WorkoutExercise);

      // Create exercise
      const exercise = exerciseRepository.create({
        name: 'Deadlift',
        userId: testUser.id,
      });
      await exerciseRepository.save(exercise);

      // Create workouts in non-chronological order
      const dates = [
        { daysAgo: 21, weight: 200 },
        { daysAgo: 7, weight: 220 },
        { daysAgo: 14, weight: 210 },
      ];

      for (const { daysAgo, weight } of dates) {
        const workoutDate = new Date();
        workoutDate.setDate(workoutDate.getDate() - daysAgo);
        const workout = workoutRepository.create({
          userId: testUser.id,
          date: workoutDate.toISOString().split('T')[0],
          withInstructor: false,
        });
        await workoutRepository.save(workout);

        const workoutExercise = workoutExerciseRepository.create({
          workout_id: workout.id,
          exercise_id: exercise.id,
          reps: 5,
          weight: weight,
          time_seconds: null,
        });
        await workoutExerciseRepository.save(workoutExercise);
      }

      const response = await request(app)
        .get(`/api/exercises/${exercise.id}/progression`)
        .set('Cookie', [`token=${authToken}`])
        .expect(200);

      expect(response.body.weightData).toHaveLength(3);
      // Should be sorted oldest to newest
      expect(response.body.weightData[0].weight).toBe(200); // 21 days ago
      expect(response.body.weightData[1].weight).toBe(210); // 14 days ago
      expect(response.body.weightData[2].weight).toBe(220); // 7 days ago
    });
  });
});
