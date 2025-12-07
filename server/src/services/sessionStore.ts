import { Response } from 'express';

export interface WorkoutPlan {
  date: string;
  exercises: Array<{
    name: string;
    reps: number;
    weight?: number;
  }>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface WorkoutHistoryItem {
  date: string;
  exercises: Array<{
    name: string;
    reps: number;
    weight?: number;
    time_seconds?: number;
  }>;
}

export interface SessionData {
  userId: number;
  sessionId: string;
  messages: ChatMessage[];
  workoutHistory: WorkoutHistoryItem[];
  currentWorkoutPlan: WorkoutPlan | null;
  userResponse: 'yes' | 'no' | null;
  createdWorkoutId: number | null;
  regenerationCount: number;
  timestamp: number;
  sseResponse?: Response;
}

export class SessionStore {
  private sessions: Map<string, SessionData> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  create(sessionId: string, userId: number): SessionData {
    const session: SessionData = {
      userId,
      sessionId,
      messages: [],
      workoutHistory: [],
      currentWorkoutPlan: null,
      userResponse: null,
      createdWorkoutId: null,
      regenerationCount: 0,
      timestamp: Date.now(),
    };
    this.sessions.set(sessionId, session);
    this.scheduleCleanup(sessionId);
    return session;
  }

  get(sessionId: string): SessionData | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.timestamp = Date.now(); // Update timestamp on access
    }
    return session;
  }

  update(sessionId: string, data: Partial<SessionData>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, data);
      session.timestamp = Date.now();
    }
  }

  delete(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session?.sseResponse) {
      try {
        session.sseResponse.end();
      } catch {
        // Response already closed, ignore error
      }
    }
    this.sessions.delete(sessionId);
  }

  private scheduleCleanup(sessionId: string): void {
    setTimeout(() => {
      const session = this.sessions.get(sessionId);
      if (session && Date.now() - session.timestamp > this.SESSION_TIMEOUT) {
        this.delete(sessionId);
      }
    }, this.SESSION_TIMEOUT);
  }

  // Clean up old sessions periodically
  startPeriodicCleanup(): void {
    setInterval(
      () => {
        const now = Date.now();
        for (const [sessionId, session] of this.sessions.entries()) {
          if (now - session.timestamp > this.SESSION_TIMEOUT) {
            this.delete(sessionId);
          }
        }
      },
      5 * 60 * 1000
    ); // Check every 5 minutes
  }
}

// Export singleton instance
export const sessionStore = new SessionStore();
sessionStore.startPeriodicCleanup();
