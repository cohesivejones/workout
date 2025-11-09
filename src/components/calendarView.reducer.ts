import { Workout, PainScore, SleepScore } from '../types';

export type CalendarState = {
  workouts: Workout[];
  painScores: PainScore[];
  sleepScores: SleepScore[];
  loading: boolean;
  error: string | null;
  currentMonth: Date;
  fetchedMonths: Set<string>;
};

export type CalendarAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_MONTH'; payload: Date }
  | {
      type: 'APPEND_MONTH_DATA';
      payload: {
        monthKey: string;
        workouts: Workout[];
        painScores: PainScore[];
        sleepScores: SleepScore[];
      };
    }
  | { type: 'MARK_MONTH_FETCHED'; payload: string };

export function createInitialCalendarState(now: Date = new Date()): CalendarState {
  return {
    workouts: [],
    painScores: [],
    sleepScores: [],
    loading: true,
    error: null,
    currentMonth: now,
    fetchedMonths: new Set<string>(),
  };
}

export function calendarReducer(state: CalendarState, action: CalendarAction): CalendarState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_MONTH':
      return { ...state, currentMonth: action.payload };
    case 'APPEND_MONTH_DATA': {
      const existingWorkoutIds = new Set(state.workouts.map((w) => w.id));
      const newWorkouts = action.payload.workouts.filter((w) => !existingWorkoutIds.has(w.id));
      const existingPainIds = new Set(state.painScores.map((p) => p.id));
      const newPainScores = action.payload.painScores.filter((p) => !existingPainIds.has(p.id));
      const existingSleepIds = new Set(state.sleepScores.map((s) => s.id));
      const newSleepScores = action.payload.sleepScores.filter((s) => !existingSleepIds.has(s.id));
      return {
        ...state,
        workouts: [...state.workouts, ...newWorkouts],
        painScores: [...state.painScores, ...newPainScores],
        sleepScores: [...state.sleepScores, ...newSleepScores],
      };
    }
    case 'MARK_MONTH_FETCHED': {
      const updated = new Set(state.fetchedMonths);
      updated.add(action.payload);
      return { ...state, fetchedMonths: updated };
    }
    default:
      return state;
  }
}
