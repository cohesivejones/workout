import { Response } from 'express';

export interface WorkoutData {
  id: number;
  date: string;
  withInstructor: boolean;
  exercises: Array<{
    name: string;
    reps: number;
    weight?: number;
    time_seconds?: number;
  }>;
}

export interface InsightsSessionData {
  userId: number;
  sessionId: string;
  question: string;
  timeframe: string;
  workoutData: WorkoutData[];
  timestamp: number;
  sseResponse?: Response;
}

export class InsightsSessionStore {
  private sessions: Map<string, InsightsSessionData> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  create(
    sessionId: string,
    userId: number,
    data: { question: string; timeframe: string; workoutData: WorkoutData[] }
  ): InsightsSessionData {
    const session: InsightsSessionData = {
      userId,
      sessionId,
      question: data.question,
      timeframe: data.timeframe,
      workoutData: data.workoutData,
      timestamp: Date.now(),
    };
    this.sessions.set(sessionId, session);
    this.scheduleCleanup(sessionId);
    return session;
  }

  get(sessionId: string): InsightsSessionData | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.timestamp = Date.now(); // Update timestamp on access
    }
    return session;
  }

  update(sessionId: string, data: Partial<InsightsSessionData>): void {
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
export const insightsSessionStore = new InsightsSessionStore();
insightsSessionStore.startPeriodicCleanup();
