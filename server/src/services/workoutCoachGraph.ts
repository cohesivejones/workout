import { ChatOpenAI } from '@langchain/openai';
import { SessionStore, WorkoutHistoryItem, WorkoutPlan } from './sessionStore';
import dataSource from '../data-source';
import { Workout, Exercise, WorkoutExercise } from '../entities';
import { Between } from 'typeorm';
import logger from '../logger';

export class WorkoutCoachGraph {
  private sessionStore: SessionStore;
  private llm: ChatOpenAI;

  constructor(sessionStore: SessionStore) {
    this.sessionStore = sessionStore;
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
    });
  }

  /**
   * Fetch last 30 days of workout history for a user
   */
  private async fetchWorkoutHistory(userId: number): Promise<WorkoutHistoryItem[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const workoutRepository = dataSource.getRepository(Workout);
      const workouts = await workoutRepository.find({
        where: {
          userId,
          date: Between(startDateStr, endDateStr),
        },
        relations: {
          workoutExercises: {
            exercise: true,
          },
        },
        order: {
          date: 'DESC',
        },
      });

      return workouts.map((workout) => ({
        date: workout.date,
        exercises: workout.workoutExercises.map((we) => ({
          name: we.exercise.name,
          reps: we.reps,
          weight: we.weight || undefined,
          time_seconds: we.time_seconds || undefined,
        })),
      }));
    } catch (error) {
      logger.error('Failed to fetch workout history', { error, userId });
      throw error;
    }
  }

  /**
   * Generate a workout plan using OpenAI based on workout history
   */
  private async generateWorkoutWithAI(history: WorkoutHistoryItem[]): Promise<WorkoutPlan> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const basePrompt =
        'You are a fitness trainer. Generate a balanced full-body workout with 6 exercises covering legs, core, and upper body. Return ONLY a JSON object with this exact structure: {"exercises": [{"name": "Exercise Name", "reps": number, "weight": number}]}. Do not include any other text, explanation, or markdown formatting.';

      let prompt = basePrompt;

      if (history.length > 0) {
        const historyText = history
          .map(
            (w) =>
              `${w.date}: ${w.exercises.map((e) => `${e.name} ${e.reps} reps${e.weight ? ` @ ${e.weight} lbs` : ''}`).join(', ')}`
          )
          .join('\n');

        prompt = `${basePrompt}\n\nRecent workout history:\n${historyText}\n\nBased on this history, suggest progressive overload where appropriate.`;
      }

      const response = await this.llm.invoke(prompt);
      const content = response.content as string;

      // Parse the JSON response
      let parsed;
      try {
        // Try to parse directly
        parsed = JSON.parse(content);
      } catch {
        // If it fails, try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          // Try to find JSON object in the text
          const objectMatch = content.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            parsed = JSON.parse(objectMatch[0]);
          } else {
            throw new Error('Could not parse workout plan from AI response');
          }
        }
      }

      return {
        date: today,
        exercises: parsed.exercises.map((e: { name: string; reps: number; weight?: number }) => ({
          name: e.name,
          reps: e.reps,
          weight: e.weight,
        })),
      };
    } catch (error) {
      logger.error('Failed to generate workout with AI', { error });
      throw error;
    }
  }

  /**
   * Create a workout in the database
   */
  private async createWorkoutInDB(userId: number, plan: WorkoutPlan): Promise<number> {
    const queryRunner = dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const workoutRepository = queryRunner.manager.getRepository(Workout);
      const workout = workoutRepository.create({
        userId,
        date: plan.date,
        withInstructor: false,
        workoutExercises: [],
      });

      await workoutRepository.save(workout);

      const exerciseRepository = queryRunner.manager.getRepository(Exercise);
      const workoutExerciseRepository = queryRunner.manager.getRepository(WorkoutExercise);

      for (const exerciseData of plan.exercises) {
        // Get or create exercise
        let exercise = await exerciseRepository.findOne({
          where: { name: exerciseData.name, userId },
        });

        if (!exercise) {
          exercise = exerciseRepository.create({
            name: exerciseData.name,
            userId,
          });
          await exerciseRepository.save(exercise);
        }

        // Create workout-exercise relationship
        const workoutExercise = workoutExerciseRepository.create({
          workout_id: workout.id,
          exercise_id: exercise.id,
          reps: exerciseData.reps,
          weight: exerciseData.weight || null,
          time_seconds: null,
          new_reps: false,
          new_weight: false,
          new_time: false,
          workout,
          exercise,
        });

        // Check for new PR flags
        const previousWorkoutExercise = await workoutExerciseRepository.query(
          `
          SELECT we.reps, we.weight, we.time_seconds
          FROM workout_exercises we
          JOIN workouts w ON we.workout_id = w.id
          WHERE we.exercise_id = $1
          AND w."userId" = $2
          AND w.date < $3
          ORDER BY w.date DESC
          LIMIT 1
        `,
          [exercise.id, userId, plan.date]
        );

        if (previousWorkoutExercise.length > 0) {
          workoutExercise.new_reps = workoutExercise.reps !== previousWorkoutExercise[0].reps;
          workoutExercise.new_weight = workoutExercise.weight !== previousWorkoutExercise[0].weight;
          workoutExercise.new_time =
            workoutExercise.time_seconds !== previousWorkoutExercise[0].time_seconds;
        } else {
          workoutExercise.new_reps = false;
          workoutExercise.new_weight = false;
          workoutExercise.new_time = false;
        }

        await workoutExerciseRepository.save(workoutExercise);
      }

      await queryRunner.commitTransaction();

      logger.info('Workout created via coach', {
        workoutId: workout.id,
        userId,
        exerciseCount: plan.exercises.length,
      });

      return workout.id;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Failed to create workout in DB', { error, userId });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Format a workout plan for display in the chat
   */
  public formatWorkoutForDisplay(plan: WorkoutPlan): string {
    const lines = ["Here's your workout for today:", ''];

    plan.exercises.forEach((exercise, index) => {
      let line = `${index + 1}. ${exercise.name} - ${exercise.reps} reps`;
      if (exercise.weight) {
        line += ` @ ${exercise.weight} lbs`;
      }
      lines.push(line);
    });

    return lines.join('\n');
  }

  /**
   * Generate a workout and stream it via SSE
   */
  public async generateWorkout(userId: number, sessionId: string): Promise<void> {
    try {
      const session = this.sessionStore.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Send generating status
      if (session.sseResponse) {
        session.sseResponse.write(`data: ${JSON.stringify({ type: 'generating' })}\n\n`);
      }

      // Fetch workout history
      const history = await this.fetchWorkoutHistory(userId);

      // Generate workout with AI
      const plan = await this.generateWorkoutWithAI(history);

      // Update session with the plan
      this.sessionStore.update(sessionId, { currentWorkoutPlan: plan });

      // Stream the workout plan
      if (session.sseResponse) {
        session.sseResponse.write(`data: ${JSON.stringify({ type: 'workout', plan })}\n\n`);
      }

      logger.info('Workout generated and streamed', { sessionId, userId });
    } catch (error) {
      logger.error('Failed to generate workout', { error, sessionId, userId });

      const session = this.sessionStore.get(sessionId);
      if (session?.sseResponse) {
        session.sseResponse.write(
          `data: ${JSON.stringify({
            type: 'error',
            message: 'Failed to generate workout',
          })}\n\n`
        );
      }

      throw error;
    }
  }

  /**
   * Handle user response (yes/no) to a workout
   */
  public async handleUserResponse(
    userId: number,
    sessionId: string,
    response: 'yes' | 'no'
  ): Promise<void> {
    try {
      const session = this.sessionStore.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (response === 'no') {
        // User rejected the workout, regenerate
        logger.info('User rejected workout, regenerating', { sessionId, userId });
        await this.generateWorkout(userId, sessionId);
      } else {
        // User accepted the workout, save to database
        logger.info('User accepted workout, saving to database', {
          sessionId,
          userId,
        });

        if (!session.currentWorkoutPlan) {
          throw new Error('No workout plan to save');
        }

        const workoutId = await this.createWorkoutInDB(userId, session.currentWorkoutPlan);

        // Send saved event
        if (session.sseResponse) {
          session.sseResponse.write(`data: ${JSON.stringify({ type: 'saved', workoutId })}\n\n`);
        }

        logger.info('Workout saved successfully', {
          sessionId,
          userId,
          workoutId,
        });
      }
    } catch (error) {
      logger.error('Failed to handle user response', {
        error,
        sessionId,
        userId,
        response,
      });

      const session = this.sessionStore.get(sessionId);
      if (session?.sseResponse) {
        session.sseResponse.write(
          `data: ${JSON.stringify({
            type: 'error',
            message: response === 'yes' ? 'Failed to save workout' : 'Failed to generate workout',
          })}\n\n`
        );
      }

      throw error;
    }
  }
}
