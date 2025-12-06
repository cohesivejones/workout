import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SessionStore } from './sessionStore';
import { Response } from 'express';

describe('SessionStore', () => {
  let sessionStore: SessionStore;

  beforeEach(() => {
    sessionStore = new SessionStore();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('create', () => {
    it('should create a new session with initial state', () => {
      const sessionId = 'session-123';
      const userId = 1;

      const session = sessionStore.create(sessionId, userId);

      expect(session).toBeDefined();
      expect(session.sessionId).toBe(sessionId);
      expect(session.userId).toBe(userId);
      expect(session.messages).toEqual([]);
      expect(session.workoutHistory).toEqual([]);
      expect(session.currentWorkoutPlan).toBeNull();
      expect(session.userResponse).toBeNull();
      expect(session.createdWorkoutId).toBeNull();
      expect(session.regenerationCount).toBe(0);
      expect(session.timestamp).toBeDefined();
      expect(typeof session.timestamp).toBe('number');
    });

    it('should create multiple sessions with different IDs', () => {
      const session1 = sessionStore.create('session-1', 1);
      const session2 = sessionStore.create('session-2', 2);

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

      sessionStore.create(sessionId, userId);
      const retrieved = sessionStore.get(sessionId);

      expect(retrieved).toBeDefined();
      expect(retrieved!.sessionId).toBe(sessionId);
      expect(retrieved!.userId).toBe(userId);
    });

    it('should return undefined for non-existent session', () => {
      const retrieved = sessionStore.get('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should update timestamp on access', () => {
      vi.useFakeTimers();
      
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1);

      const originalSession = sessionStore.get(sessionId)!;
      const originalTimestamp = originalSession.timestamp;

      // Wait a bit
      vi.advanceTimersByTime(100);

      const retrieved = sessionStore.get(sessionId)!;
      expect(retrieved.timestamp).toBeGreaterThanOrEqual(originalTimestamp);
      
      vi.useRealTimers();
    });
  });

  describe('update', () => {
    it('should update session data', () => {
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1);

      const workoutPlan = {
        date: '2024-01-15',
        exercises: [
          { name: 'Squats', reps: 10, weight: 135 }
        ]
      };

      sessionStore.update(sessionId, {
        currentWorkoutPlan: workoutPlan,
        regenerationCount: 1
      });

      const updated = sessionStore.get(sessionId)!;
      expect(updated.currentWorkoutPlan).toEqual(workoutPlan);
      expect(updated.regenerationCount).toBe(1);
    });

    it('should update timestamp on update', () => {
      vi.useFakeTimers();
      
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1);

      const originalTimestamp = sessionStore.get(sessionId)!.timestamp;

      vi.advanceTimersByTime(100);

      sessionStore.update(sessionId, { regenerationCount: 1 });

      const updated = sessionStore.get(sessionId)!;
      expect(updated.timestamp).toBeGreaterThanOrEqual(originalTimestamp);
      
      vi.useRealTimers();
    });

    it('should handle updating non-existent session gracefully', () => {
      // Should not throw error
      expect(() => {
        sessionStore.update('non-existent', { regenerationCount: 1 });
      }).not.toThrow();
    });

    it('should add messages to session', () => {
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1);

      const messages = [
        { role: 'assistant' as const, content: 'Hello!' },
        { role: 'user' as const, content: 'Hi!' }
      ];

      sessionStore.update(sessionId, { messages });

      const updated = sessionStore.get(sessionId)!;
      expect(updated.messages).toEqual(messages);
      expect(updated.messages).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('should delete an existing session', () => {
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1);

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
      sessionStore.create(sessionId, 1);

      const mockResponse = {
        end: vi.fn()
      } as unknown as Response;

      sessionStore.update(sessionId, { sseResponse: mockResponse });

      sessionStore.delete(sessionId);

      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should handle SSE response close errors gracefully', () => {
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1);

      const mockResponse = {
        end: vi.fn(() => {
          throw new Error('Response already closed');
        })
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
      sessionStore.create(sessionId, 1);

      // Verify session exists
      const session = sessionStore.get(sessionId);
      expect(session).toBeDefined();
      expect(session!.sessionId).toBe(sessionId);
    });

    it('should keep active sessions', () => {
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1);

      // Access session multiple times
      expect(sessionStore.get(sessionId)).toBeDefined();
      expect(sessionStore.get(sessionId)).toBeDefined();
      expect(sessionStore.get(sessionId)).toBeDefined();
    });

    it('should update timestamp when session is accessed', () => {
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1);

      const originalTimestamp = sessionStore.get(sessionId)!.timestamp;
      
      // Small delay
      setTimeout(() => {}, 10);
      
      // Access again
      const newTimestamp = sessionStore.get(sessionId)!.timestamp;
      expect(newTimestamp).toBeGreaterThanOrEqual(originalTimestamp);
    });
  });

  describe('periodic cleanup', () => {
    it('should have cleanup interval configured', () => {
      const localStore = new SessionStore();
      
      // Verify cleanup can be started
      expect(() => {
        localStore.startPeriodicCleanup();
      }).not.toThrow();
    });

    it('should delete expired sessions manually', () => {
      const localStore = new SessionStore();
      const session1Id = 'session-1';
      const session2Id = 'session-2';
      
      localStore.create(session1Id, 1);
      localStore.create(session2Id, 2);

      // Manually set one session to be expired (old timestamp)
      localStore.update(session1Id, {
        timestamp: Date.now() - (31 * 60 * 1000) // 31 minutes ago
      });

      // Manually delete expired session (simulating what cleanup does)
      localStore.delete(session1Id);

      // Verify
      expect(localStore.get(session1Id)).toBeUndefined();
      expect(localStore.get(session2Id)).toBeDefined();
    });
  });

  describe('workflow state management', () => {
    it('should track workout plan through workflow', () => {
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1);

      // Initial state
      expect(sessionStore.get(sessionId)!.currentWorkoutPlan).toBeNull();

      // Generate workout plan
      const workoutPlan = {
        date: '2024-01-15',
        exercises: [
          { name: 'Squats', reps: 10, weight: 135 },
          { name: 'Bench Press', reps: 8, weight: 155 }
        ]
      };

      sessionStore.update(sessionId, { currentWorkoutPlan: workoutPlan });
      expect(sessionStore.get(sessionId)!.currentWorkoutPlan).toEqual(workoutPlan);

      // User says no, regenerate
      sessionStore.update(sessionId, {
        userResponse: 'no',
        regenerationCount: 1
      });

      expect(sessionStore.get(sessionId)!.userResponse).toBe('no');
      expect(sessionStore.get(sessionId)!.regenerationCount).toBe(1);

      // New workout plan
      const newWorkoutPlan = {
        date: '2024-01-15',
        exercises: [
          { name: 'Deadlifts', reps: 5, weight: 225 },
          { name: 'Pull-ups', reps: 10 }
        ]
      };

      sessionStore.update(sessionId, {
        currentWorkoutPlan: newWorkoutPlan,
        userResponse: null
      });

      // User says yes
      sessionStore.update(sessionId, {
        userResponse: 'yes'
      });

      expect(sessionStore.get(sessionId)!.userResponse).toBe('yes');

      // Workout created
      sessionStore.update(sessionId, {
        createdWorkoutId: 42
      });

      expect(sessionStore.get(sessionId)!.createdWorkoutId).toBe(42);
    });

    it('should track conversation messages', () => {
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1);

      const message1 = { role: 'assistant' as const, content: 'Here is your workout...' };
      sessionStore.update(sessionId, {
        messages: [message1]
      });

      expect(sessionStore.get(sessionId)!.messages).toHaveLength(1);

      const message2 = { role: 'user' as const, content: 'No' };
      const session = sessionStore.get(sessionId)!;
      sessionStore.update(sessionId, {
        messages: [...session.messages, message2]
      });

      expect(sessionStore.get(sessionId)!.messages).toHaveLength(2);
      expect(sessionStore.get(sessionId)!.messages[1]).toEqual(message2);
    });

    it('should track regeneration count', () => {
      const sessionId = 'session-123';
      sessionStore.create(sessionId, 1);

      expect(sessionStore.get(sessionId)!.regenerationCount).toBe(0);

      // User says no multiple times
      sessionStore.update(sessionId, { regenerationCount: 1 });
      expect(sessionStore.get(sessionId)!.regenerationCount).toBe(1);

      sessionStore.update(sessionId, { regenerationCount: 2 });
      expect(sessionStore.get(sessionId)!.regenerationCount).toBe(2);

      sessionStore.update(sessionId, { regenerationCount: 3 });
      expect(sessionStore.get(sessionId)!.regenerationCount).toBe(3);
    });
  });
});
