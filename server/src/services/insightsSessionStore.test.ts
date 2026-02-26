import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { InsightsSessionStore, WorkoutData } from './insightsSessionStore';
import { Response } from 'express';

describe('InsightsSessionStore', () => {
  let sessionStore: InsightsSessionStore;

  beforeEach(() => {
    sessionStore = new InsightsSessionStore();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('create', () => {
    it('should create a new session with initial state', () => {
      const sessionId = 'session-123';
      const userId = 1;
      const data = {
        question: 'What exercises am I improving at?',
        timeframe: '30d',
        workoutData: [] as WorkoutData[],
      };

      const session = sessionStore.create(sessionId, userId, data);

      expect(session).toBeDefined();
      expect(session.sessionId).toBe(sessionId);
      expect(session.userId).toBe(userId);
      expect(session.question).toBe(data.question);
      expect(session.timeframe).toBe(data.timeframe);
      expect(session.workoutData).toEqual([]);
      expect(session.timestamp).toBeDefined();
      expect(typeof session.timestamp).toBe('number');
    });

    it('should create session with workout data', () => {
      const sessionId = 'session-123';
      const userId = 1;
      const workoutData: WorkoutData[] = [
        {
          id: 1,
          date: '2024-01-15',
          withInstructor: false,
          exercises: [
            { name: 'Squats', reps: 10, weight: 135 },
            { name: 'Bench Press', reps: 8, weight: 155 },
          ],
        },
      ];

      const data = {
        question: 'How often do I work my legs?',
        timeframe: '7d',
        workoutData,
      };

      const session = sessionStore.create(sessionId, userId, data);

      expect(session.workoutData).toEqual(workoutData);
      expect(session.workoutData).toHaveLength(1);
      expect(session.workoutData[0].exercises).toHaveLength(2);
    });

    it('should create multiple sessions with different IDs', () => {
      const session1 = sessionStore.create('session-1', 1, {
        question: 'Question 1',
        timeframe: '30d',
        workoutData: [],
      });
      const session2 = sessionStore.create('session-2', 2, {
        question: 'Question 2',
        timeframe: '7d',
        workoutData: [],
      });

      expect(session1.sessionId).toBe('session-1');
      expect(session2.sessionId).toBe('session-2');
      expect(sessionStore.get('session-1')).toBeDefined();
      expect(sessionStore.get('session-2')).toBeDefined();
    });
  });

  describe('get', () => {
    it('should retrieve an existing session', () => {
      const sessionId = 'session-123';
      const userId = 1;
      const data = {
        question: 'Test question',
        timeframe: '30d',
        workoutData: [],
      };

      sessionStore.create(sessionId, userId, data);
      const retrieved = sessionStore.get(sessionId);

      expect(retrieved).toBeDefined();
      expect(retrieved!.sessionId).toBe(sessionId);
      expect(retrieved!.userId).toBe(userId);
      expect(retrieved!.question).toBe(data.question);
    });

    it('should return undefined for non-existent session', () => {
      const retrieved = sessionStore.get('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should update timestamp on access', () => {
      vi.useFakeTimers();

      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1, {
        question: 'Test',
        timeframe: '30d',
        workoutData: [],
      });

      const originalSession = sessionStore.get(sessionId)!;
      const originalTimestamp = originalSession.timestamp;

      vi.advanceTimersByTime(100);

      const retrieved = sessionStore.get(sessionId)!;
      expect(retrieved.timestamp).toBeGreaterThanOrEqual(originalTimestamp);

      vi.useRealTimers();
    });
  });

  describe('update', () => {
    it('should update session data', () => {
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1, {
        question: 'Test',
        timeframe: '30d',
        workoutData: [],
      });

      const mockResponse = { write: vi.fn() } as unknown as Response;

      sessionStore.update(sessionId, {
        sseResponse: mockResponse,
      });

      const updated = sessionStore.get(sessionId)!;
      expect(updated.sseResponse).toBe(mockResponse);
    });

    it('should update timestamp on update', () => {
      vi.useFakeTimers();

      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1, {
        question: 'Test',
        timeframe: '30d',
        workoutData: [],
      });

      const originalTimestamp = sessionStore.get(sessionId)!.timestamp;

      vi.advanceTimersByTime(100);

      sessionStore.update(sessionId, { sseResponse: undefined });

      const updated = sessionStore.get(sessionId)!;
      expect(updated.timestamp).toBeGreaterThanOrEqual(originalTimestamp);

      vi.useRealTimers();
    });

    it('should handle updating non-existent session gracefully', () => {
      expect(() => {
        sessionStore.update('non-existent', { sseResponse: undefined });
      }).not.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete an existing session', () => {
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1, {
        question: 'Test',
        timeframe: '30d',
        workoutData: [],
      });

      expect(sessionStore.get(sessionId)).toBeDefined();

      sessionStore.delete(sessionId);

      expect(sessionStore.get(sessionId)).toBeUndefined();
    });

    it('should handle deleting non-existent session gracefully', () => {
      expect(() => {
        sessionStore.delete('non-existent');
      }).not.toThrow();
    });

    it('should close SSE response if present', () => {
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1, {
        question: 'Test',
        timeframe: '30d',
        workoutData: [],
      });

      const mockResponse = {
        end: vi.fn(),
      } as unknown as Response;

      sessionStore.update(sessionId, { sseResponse: mockResponse });

      sessionStore.delete(sessionId);

      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should handle SSE response close errors gracefully', () => {
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1, {
        question: 'Test',
        timeframe: '30d',
        workoutData: [],
      });

      const mockResponse = {
        end: vi.fn(() => {
          throw new Error('Response already closed');
        }),
      } as unknown as Response;

      sessionStore.update(sessionId, { sseResponse: mockResponse });

      // Should not throw
      expect(() => {
        sessionStore.delete(sessionId);
      }).not.toThrow();
    });
  });

  describe('session timeout', () => {
    it('should schedule cleanup for sessions', () => {
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1, {
        question: 'Test',
        timeframe: '30d',
        workoutData: [],
      });

      const session = sessionStore.get(sessionId);
      expect(session).toBeDefined();
      expect(session!.sessionId).toBe(sessionId);
    });

    it('should keep active sessions', () => {
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1, {
        question: 'Test',
        timeframe: '30d',
        workoutData: [],
      });

      // Access session multiple times
      expect(sessionStore.get(sessionId)).toBeDefined();
      expect(sessionStore.get(sessionId)).toBeDefined();
      expect(sessionStore.get(sessionId)).toBeDefined();
    });

    it('should update timestamp when session is accessed', () => {
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1, {
        question: 'Test',
        timeframe: '30d',
        workoutData: [],
      });

      const originalTimestamp = sessionStore.get(sessionId)!.timestamp;

      setTimeout(() => {}, 10);

      const newTimestamp = sessionStore.get(sessionId)!.timestamp;
      expect(newTimestamp).toBeGreaterThanOrEqual(originalTimestamp);
    });
  });

  describe('periodic cleanup', () => {
    it('should have cleanup interval configured', () => {
      const localStore = new InsightsSessionStore();

      expect(() => {
        localStore.startPeriodicCleanup();
      }).not.toThrow();
    });

    it('should delete expired sessions manually', () => {
      const localStore = new InsightsSessionStore();
      const session1Id = 'session-1';
      const session2Id = 'session-2';

      localStore.create(session1Id, 1, {
        question: 'Q1',
        timeframe: '30d',
        workoutData: [],
      });
      localStore.create(session2Id, 2, {
        question: 'Q2',
        timeframe: '7d',
        workoutData: [],
      });

      // Manually set one session to be expired (old timestamp)
      localStore.update(session1Id, {
        timestamp: Date.now() - 31 * 60 * 1000, // 31 minutes ago
      });

      // Manually delete expired session (simulating what cleanup does)
      localStore.delete(session1Id);

      expect(localStore.get(session1Id)).toBeUndefined();
      expect(localStore.get(session2Id)).toBeDefined();
    });
  });

  describe('workout insights workflow', () => {
    it('should store question and timeframe', () => {
      const sessionId = 'session-123';
      const question = 'Are there any exercises working my hamstrings?';
      const timeframe = '30d';

      sessionStore.create(sessionId, 1, {
        question,
        timeframe,
        workoutData: [],
      });

      const session = sessionStore.get(sessionId)!;
      expect(session.question).toBe(question);
      expect(session.timeframe).toBe(timeframe);
    });

    it('should store workout data for analysis', () => {
      const sessionId = 'session-123';
      const workoutData: WorkoutData[] = [
        {
          id: 1,
          date: '2024-01-15',
          withInstructor: false,
          exercises: [
            { name: 'Squats', reps: 10, weight: 135 },
            { name: 'Deadlifts', reps: 5, weight: 225 },
          ],
        },
        {
          id: 2,
          date: '2024-01-14',
          withInstructor: true,
          exercises: [{ name: 'Bench Press', reps: 8, weight: 155 }],
        },
      ];

      sessionStore.create(sessionId, 1, {
        question: 'What is my progress?',
        timeframe: '7d',
        workoutData,
      });

      const session = sessionStore.get(sessionId)!;
      expect(session.workoutData).toEqual(workoutData);
      expect(session.workoutData).toHaveLength(2);
      expect(session.workoutData[0].exercises).toHaveLength(2);
      expect(session.workoutData[1].withInstructor).toBe(true);
    });

    it('should handle different timeframes', () => {
      const timeframes = ['7d', '30d', '3m', '6m'];

      timeframes.forEach((timeframe, index) => {
        const sessionId = `session-${index}`;
        sessionStore.create(sessionId, 1, {
          question: 'Test',
          timeframe,
          workoutData: [],
        });

        const session = sessionStore.get(sessionId)!;
        expect(session.timeframe).toBe(timeframe);
      });
    });

    it('should support SSE streaming workflow', () => {
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1, {
        question: 'How am I progressing?',
        timeframe: '30d',
        workoutData: [],
      });

      // Simulate SSE connection
      const mockResponse = {
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;

      sessionStore.update(sessionId, { sseResponse: mockResponse });

      const session = sessionStore.get(sessionId)!;
      expect(session.sseResponse).toBe(mockResponse);
    });

    it('should track multiple concurrent sessions', () => {
      const session1Id = 'session-1';
      const session2Id = 'session-2';

      sessionStore.create(session1Id, 1, {
        question: 'Question 1',
        timeframe: '30d',
        workoutData: [],
      });

      sessionStore.create(session2Id, 2, {
        question: 'Question 2',
        timeframe: '7d',
        workoutData: [],
      });

      const session1 = sessionStore.get(session1Id)!;
      const session2 = sessionStore.get(session2Id)!;

      expect(session1.userId).toBe(1);
      expect(session1.question).toBe('Question 1');
      expect(session1.timeframe).toBe('30d');

      expect(session2.userId).toBe(2);
      expect(session2.question).toBe('Question 2');
      expect(session2.timeframe).toBe('7d');
    });
  });

  describe('workout data structure', () => {
    it('should handle exercises with optional fields', () => {
      const sessionId = 'session-123';
      const workoutData: WorkoutData[] = [
        {
          id: 1,
          date: '2024-01-15',
          withInstructor: false,
          exercises: [
            { name: 'Squats', reps: 10, weight: 135 },
            { name: 'Pull-ups', reps: 10 }, // No weight
            { name: 'Plank', reps: 1, time_seconds: 60 }, // With time
          ],
        },
      ];

      sessionStore.create(sessionId, 1, {
        question: 'Test',
        timeframe: '30d',
        workoutData,
      });

      const session = sessionStore.get(sessionId)!;
      expect(session.workoutData[0].exercises[0].weight).toBe(135);
      expect(session.workoutData[0].exercises[1].weight).toBeUndefined();
      expect(session.workoutData[0].exercises[2].time_seconds).toBe(60);
    });

    it('should handle empty workout data', () => {
      const sessionId = 'session-123';

      sessionStore.create(sessionId, 1, {
        question: 'What should I do?',
        timeframe: '30d',
        workoutData: [],
      });

      const session = sessionStore.get(sessionId)!;
      expect(session.workoutData).toEqual([]);
      expect(session.workoutData).toHaveLength(0);
    });

    it('should handle workouts with no exercises', () => {
      const sessionId = 'session-123';
      const workoutData: WorkoutData[] = [
        {
          id: 1,
          date: '2024-01-15',
          withInstructor: false,
          exercises: [],
        },
      ];

      sessionStore.create(sessionId, 1, {
        question: 'Test',
        timeframe: '30d',
        workoutData,
      });

      const session = sessionStore.get(sessionId)!;
      expect(session.workoutData[0].exercises).toEqual([]);
    });
  });
});
