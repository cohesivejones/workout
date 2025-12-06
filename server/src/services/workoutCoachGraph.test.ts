import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkoutCoachGraph } from './workoutCoachGraph';
import { SessionStore } from './sessionStore';

// Mock OpenAI
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(() => ({
    invoke: vi.fn(),
  })),
}));

describe('WorkoutCoachGraph', () => {
  let graph: WorkoutCoachGraph;
  let sessionStore: SessionStore;

  beforeEach(() => {
    sessionStore = new SessionStore();
    graph = new WorkoutCoachGraph(sessionStore);
  });

  describe('initialization', () => {
    it('should create a workout coach graph instance', () => {
      expect(graph).toBeDefined();
      expect(graph).toBeInstanceOf(WorkoutCoachGraph);
    });

    it('should have a session store', () => {
      expect(graph['sessionStore']).toBeDefined();
      expect(graph['sessionStore']).toBe(sessionStore);
    });
  });

  describe('fetchWorkoutHistory', () => {
    it('should fetch last 30 days of workout history', async () => {
      const userId = 1;
      const mockHistory = [
        {
          date: '2024-01-15',
          exercises: [
            { name: 'Squats', reps: 10, weight: 135 },
            { name: 'Bench Press', reps: 8, weight: 155 },
          ],
        },
        {
          date: '2024-01-13',
          exercises: [
            { name: 'Deadlifts', reps: 5, weight: 225 },
          ],
        },
      ];

      // Mock the database query
      const fetchHistory = vi.fn().mockResolvedValue(mockHistory);
      graph['fetchWorkoutHistory'] = fetchHistory;

      const history = await graph['fetchWorkoutHistory'](userId);

      expect(fetchHistory).toHaveBeenCalledWith(userId);
      expect(history).toEqual(mockHistory);
      expect(history).toHaveLength(2);
    });

    it('should return empty array if no workout history', async () => {
      const userId = 1;
      const fetchHistory = vi.fn().mockResolvedValue([]);
      graph['fetchWorkoutHistory'] = fetchHistory;

      const history = await graph['fetchWorkoutHistory'](userId);

      expect(history).toEqual([]);
    });
  });

  describe('generateWorkout', () => {
    it('should generate workout using OpenAI', async () => {
      const mockHistory = [
        {
          date: '2024-01-15',
          exercises: [
            { name: 'Squats', reps: 10, weight: 135 },
          ],
        },
      ];

      const mockWorkoutPlan = {
        date: new Date().toISOString().split('T')[0],
        exercises: [
          { name: 'Squats', reps: 12, weight: 140 },
          { name: 'Bench Press', reps: 10, weight: 155 },
          { name: 'Deadlifts', reps: 8, weight: 185 },
        ],
      };

      const generateWorkout = vi.fn().mockResolvedValue(mockWorkoutPlan);
      graph['generateWorkoutWithAI'] = generateWorkout;

      const workout = await graph['generateWorkoutWithAI'](mockHistory);

      expect(generateWorkout).toHaveBeenCalledWith(mockHistory);
      expect(workout).toBeDefined();
      expect(workout.exercises).toHaveLength(3);
      expect(workout.date).toBeDefined();
    });

    it('should handle OpenAI errors gracefully', async () => {
      const mockHistory = [
        {
          date: '2024-01-15',
          exercises: [{ name: 'Squats', reps: 10, weight: 135 }],
        },
      ];

      const generateWorkout = vi.fn().mockRejectedValue(new Error('OpenAI API error'));
      graph['generateWorkoutWithAI'] = generateWorkout;

      await expect(graph['generateWorkoutWithAI'](mockHistory)).rejects.toThrow('OpenAI API error');
    });
  });

  describe('createWorkout', () => {
    it('should create workout in database', async () => {
      const userId = 1;
      const workoutPlan = {
        date: '2024-01-15',
        exercises: [
          { name: 'Squats', reps: 10, weight: 135 },
          { name: 'Bench Press', reps: 8, weight: 155 },
        ],
      };

      const mockWorkoutId = 42;
      const createWorkout = vi.fn().mockResolvedValue(mockWorkoutId);
      graph['createWorkoutInDB'] = createWorkout;

      const workoutId = await graph['createWorkoutInDB'](userId, workoutPlan);

      expect(createWorkout).toHaveBeenCalledWith(userId, workoutPlan);
      expect(workoutId).toBe(mockWorkoutId);
      expect(typeof workoutId).toBe('number');
    });

    it('should handle database errors', async () => {
      const userId = 1;
      const workoutPlan = {
        date: '2024-01-15',
        exercises: [{ name: 'Squats', reps: 10, weight: 135 }],
      };

      const createWorkout = vi.fn().mockRejectedValue(new Error('Database error'));
      graph['createWorkoutInDB'] = createWorkout;

      await expect(graph['createWorkoutInDB'](userId, workoutPlan)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('workflow execution', () => {
    it('should execute full workflow with user saying yes', async () => {
      const sessionId = 'session-123';
      const userId = 1;

      // Setup mocks
      const mockHistory = [
        {
          date: '2024-01-15',
          exercises: [{ name: 'Squats', reps: 10, weight: 135 }],
        },
      ];

      const mockWorkoutPlan = {
        date: '2024-01-16',
        exercises: [
          { name: 'Squats', reps: 12, weight: 140 },
          { name: 'Bench Press', reps: 10, weight: 155 },
        ],
      };

      const mockWorkoutId = 42;

      graph['fetchWorkoutHistory'] = vi.fn().mockResolvedValue(mockHistory);
      graph['generateWorkoutWithAI'] = vi.fn().mockResolvedValue(mockWorkoutPlan);
      graph['createWorkoutInDB'] = vi.fn().mockResolvedValue(mockWorkoutId);

      // Create session
      sessionStore.create(sessionId, userId);

      // Simulate workflow
      const history = await graph['fetchWorkoutHistory'](userId);
      const workout = await graph['generateWorkoutWithAI'](history);

      // Update session with workout
      sessionStore.update(sessionId, {
        currentWorkoutPlan: workout,
        workoutHistory: history,
      });

      // Simulate user saying yes
      sessionStore.update(sessionId, { userResponse: 'yes' });

      // Create workout
      const session = sessionStore.get(sessionId)!;
      if (session.userResponse === 'yes' && session.currentWorkoutPlan) {
        const workoutId = await graph['createWorkoutInDB'](userId, session.currentWorkoutPlan);
        sessionStore.update(sessionId, { createdWorkoutId: workoutId });
      }

      // Verify
      const finalSession = sessionStore.get(sessionId)!;
      expect(finalSession.createdWorkoutId).toBe(mockWorkoutId);
      expect(finalSession.userResponse).toBe('yes');
      expect(finalSession.currentWorkoutPlan).toEqual(mockWorkoutPlan);
    });

    it('should regenerate workout when user says no', async () => {
      const sessionId = 'session-123';
      const userId = 1;

      const mockHistory = [
        {
          date: '2024-01-15',
          exercises: [{ name: 'Squats', reps: 10, weight: 135 }],
        },
      ];

      const firstWorkout = {
        date: '2024-01-16',
        exercises: [{ name: 'Squats', reps: 12, weight: 140 }],
      };

      const secondWorkout = {
        date: '2024-01-16',
        exercises: [{ name: 'Deadlifts', reps: 5, weight: 225 }],
      };

      const mockWorkoutId = 43;

      graph['fetchWorkoutHistory'] = vi.fn().mockResolvedValue(mockHistory);
      graph['generateWorkoutWithAI'] = vi
        .fn()
        .mockResolvedValueOnce(firstWorkout)
        .mockResolvedValueOnce(secondWorkout);
      graph['createWorkoutInDB'] = vi.fn().mockResolvedValue(mockWorkoutId);

      // Create session
      sessionStore.create(sessionId, userId);

      // First generation
      const history = await graph['fetchWorkoutHistory'](userId);
      const workout1 = await graph['generateWorkoutWithAI'](history);
      sessionStore.update(sessionId, {
        currentWorkoutPlan: workout1,
        workoutHistory: history,
      });

      // User says no
      sessionStore.update(sessionId, {
        userResponse: 'no',
        regenerationCount: 1,
      });

      // Regenerate
      const workout2 = await graph['generateWorkoutWithAI'](history);
      sessionStore.update(sessionId, {
        currentWorkoutPlan: workout2,
        userResponse: null,
      });

      // User says yes
      sessionStore.update(sessionId, { userResponse: 'yes' });

      // Create workout
      const session = sessionStore.get(sessionId)!;
      if (session.userResponse === 'yes' && session.currentWorkoutPlan) {
        const workoutId = await graph['createWorkoutInDB'](userId, session.currentWorkoutPlan);
        sessionStore.update(sessionId, { createdWorkoutId: workoutId });
      }

      // Verify
      const finalSession = sessionStore.get(sessionId)!;
      expect(finalSession.createdWorkoutId).toBe(mockWorkoutId);
      expect(finalSession.regenerationCount).toBe(1);
      expect(finalSession.currentWorkoutPlan).toEqual(secondWorkout);
      expect(graph['generateWorkoutWithAI']).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple regenerations', async () => {
      const sessionId = 'session-123';
      const userId = 1;

      const mockHistory = [
        {
          date: '2024-01-15',
          exercises: [{ name: 'Squats', reps: 10, weight: 135 }],
        },
      ];

      const workouts = [
        {
          date: '2024-01-16',
          exercises: [{ name: 'Squats', reps: 12, weight: 140 }],
        },
        {
          date: '2024-01-16',
          exercises: [{ name: 'Bench Press', reps: 10, weight: 155 }],
        },
        {
          date: '2024-01-16',
          exercises: [{ name: 'Deadlifts', reps: 5, weight: 225 }],
        },
      ];

      graph['fetchWorkoutHistory'] = vi.fn().mockResolvedValue(mockHistory);
      graph['generateWorkoutWithAI'] = vi
        .fn()
        .mockResolvedValueOnce(workouts[0])
        .mockResolvedValueOnce(workouts[1])
        .mockResolvedValueOnce(workouts[2]);
      graph['createWorkoutInDB'] = vi.fn().mockResolvedValue(44);

      // Create session
      sessionStore.create(sessionId, userId);

      const history = await graph['fetchWorkoutHistory'](userId);
      sessionStore.update(sessionId, { workoutHistory: history });

      // User says no 3 times before saying yes
      for (let i = 0; i < 3; i++) {
        const workout = await graph['generateWorkoutWithAI'](history);
        sessionStore.update(sessionId, {
          currentWorkoutPlan: workout,
          regenerationCount: i,
        });

        if (i < 2) {
          // Say no
          sessionStore.update(sessionId, { userResponse: 'no' });
        } else {
          // Say yes on third try
          sessionStore.update(sessionId, { userResponse: 'yes' });
        }
      }

      // Create workout
      const session = sessionStore.get(sessionId)!;
      if (session.userResponse === 'yes' && session.currentWorkoutPlan) {
        const workoutId = await graph['createWorkoutInDB'](userId, session.currentWorkoutPlan);
        sessionStore.update(sessionId, { createdWorkoutId: workoutId });
      }

      // Verify
      const finalSession = sessionStore.get(sessionId)!;
      expect(finalSession.regenerationCount).toBe(2);
      expect(finalSession.createdWorkoutId).toBe(44);
      expect(graph['generateWorkoutWithAI']).toHaveBeenCalledTimes(3);
    });
  });

  describe('formatWorkoutForDisplay', () => {
    it('should format workout plan as readable text', () => {
      const workoutPlan = {
        date: '2024-01-16',
        exercises: [
          { name: 'Squats', reps: 12, weight: 140 },
          { name: 'Bench Press', reps: 10, weight: 155 },
          { name: 'Deadlifts', reps: 5, weight: 225 },
        ],
      };

      const formatted = graph.formatWorkoutForDisplay(workoutPlan);

      expect(formatted).toContain('Squats');
      expect(formatted).toContain('12');
      expect(formatted).toContain('140');
      expect(formatted).toContain('Bench Press');
      expect(formatted).toContain('10');
      expect(formatted).toContain('155');
      expect(formatted).toContain('Deadlifts');
      expect(formatted).toContain('5');
      expect(formatted).toContain('225');
    });

    it('should handle exercises without weights', () => {
      const workoutPlan = {
        date: '2024-01-16',
        exercises: [
          { name: 'Push-ups', reps: 20 },
          { name: 'Pull-ups', reps: 10 },
        ],
      };

      const formatted = graph.formatWorkoutForDisplay(workoutPlan);

      expect(formatted).toContain('Push-ups');
      expect(formatted).toContain('20');
      expect(formatted).toContain('Pull-ups');
      expect(formatted).toContain('10');
    });
  });
});
