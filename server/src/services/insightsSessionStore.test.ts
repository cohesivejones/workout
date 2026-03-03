import { describe, it, expect, beforeEach } from 'vitest';
import { InsightsSessionStore, WorkoutData, ConversationMessage } from './insightsSessionStore';

describe('InsightsSessionStore', () => {
  let store: InsightsSessionStore;

  beforeEach(() => {
    store = new InsightsSessionStore();
  });

  describe('create', () => {
    it('should create a new session with initial question', () => {
      const sessionId = 'test-session-123';
      const userId = 1;
      const workoutData: WorkoutData[] = [
        {
          id: 1,
          date: '2026-01-15',
          withInstructor: false,
          exercises: [
            { name: 'Bench Press', reps: 10, weight: 135 },
            { name: 'Squats', reps: 8, weight: 185 },
          ],
        },
      ];

      const session = store.create(sessionId, userId, {
        initialQuestion: 'What is my progress?',
        timeframe: '30d',
        workoutData,
      });

      expect(session.sessionId).toBe(sessionId);
      expect(session.userId).toBe(userId);
      expect(session.timeframe).toBe('30d');
      expect(session.workoutData).toEqual(workoutData);
      expect(session.messages).toHaveLength(1);
      expect(session.messages[0]).toEqual({
        role: 'user',
        content: 'What is my progress?',
      });
      expect(session.timestamp).toBeDefined();
    });

    it('should store the session for later retrieval', () => {
      const sessionId = 'test-session-456';
      const userId = 2;

      store.create(sessionId, userId, {
        initialQuestion: 'Test question',
        timeframe: '7d',
        workoutData: [],
      });

      const retrieved = store.get(sessionId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe(sessionId);
      expect(retrieved?.userId).toBe(userId);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent session', () => {
      const session = store.get('non-existent-id');
      expect(session).toBeUndefined();
    });

    it('should update timestamp on access', () => {
      const sessionId = 'test-session-789';
      store.create(sessionId, 1, {
        initialQuestion: 'Test',
        timeframe: '30d',
        workoutData: [],
      });

      const firstAccess = store.get(sessionId);
      const firstTimestamp = firstAccess?.timestamp;

      // Wait a tiny bit
      setTimeout(() => {
        const secondAccess = store.get(sessionId);
        const secondTimestamp = secondAccess?.timestamp;

        expect(secondTimestamp).toBeGreaterThanOrEqual(firstTimestamp!);
      }, 10);
    });
  });

  describe('addMessage', () => {
    it('should add a message to existing session', () => {
      const sessionId = 'test-session-msg';
      store.create(sessionId, 1, {
        initialQuestion: 'Initial question',
        timeframe: '30d',
        workoutData: [],
      });

      const newMessage: ConversationMessage = {
        role: 'assistant',
        content: 'Here is the answer',
      };

      store.addMessage(sessionId, newMessage);

      const session = store.get(sessionId);
      expect(session?.messages).toHaveLength(2);
      expect(session?.messages[1]).toEqual(newMessage);
    });

    it('should update timestamp when adding message', () => {
      const sessionId = 'test-session-timestamp';
      store.create(sessionId, 1, {
        initialQuestion: 'Test',
        timeframe: '30d',
        workoutData: [],
      });

      const initialSession = store.get(sessionId);
      const initialTimestamp = initialSession?.timestamp;

      // Wait a bit then add message
      setTimeout(() => {
        store.addMessage(sessionId, { role: 'assistant', content: 'Response' });
        const updatedSession = store.get(sessionId);
        expect(updatedSession?.timestamp).toBeGreaterThanOrEqual(initialTimestamp!);
      }, 10);
    });

    it('should handle adding message to non-existent session gracefully', () => {
      // Should not throw
      expect(() => {
        store.addMessage('non-existent', { role: 'user', content: 'Test' });
      }).not.toThrow();
    });

    it('should support building a conversation', () => {
      const sessionId = 'conversation-test';
      store.create(sessionId, 1, {
        initialQuestion: 'What exercises am I improving at?',
        timeframe: '30d',
        workoutData: [],
      });

      store.addMessage(sessionId, {
        role: 'assistant',
        content: 'You are improving at bench press and squats.',
      });

      store.addMessage(sessionId, {
        role: 'user',
        content: 'Tell me more about bench press',
      });

      store.addMessage(sessionId, {
        role: 'assistant',
        content: 'Your bench press has increased by 10 lbs.',
      });

      const session = store.get(sessionId);
      expect(session?.messages).toHaveLength(4);
      expect(session?.messages[0].role).toBe('user');
      expect(session?.messages[1].role).toBe('assistant');
      expect(session?.messages[2].role).toBe('user');
      expect(session?.messages[3].role).toBe('assistant');
    });
  });

  describe('update', () => {
    it('should update session properties', () => {
      const sessionId = 'test-update';
      store.create(sessionId, 1, {
        initialQuestion: 'Test',
        timeframe: '30d',
        workoutData: [],
      });

      store.update(sessionId, { timeframe: '7d' });

      const session = store.get(sessionId);
      expect(session?.timeframe).toBe('7d');
    });

    it('should not throw for non-existent session', () => {
      expect(() => {
        store.update('non-existent', { timeframe: '7d' });
      }).not.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete a session', () => {
      const sessionId = 'test-delete';
      store.create(sessionId, 1, {
        initialQuestion: 'Test',
        timeframe: '30d',
        workoutData: [],
      });

      expect(store.get(sessionId)).toBeDefined();

      store.delete(sessionId);

      expect(store.get(sessionId)).toBeUndefined();
    });

    it('should not throw when deleting non-existent session', () => {
      expect(() => {
        store.delete('non-existent');
      }).not.toThrow();
    });
  });
});
