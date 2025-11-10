import { Workout, PainScore, SleepScore } from '../types';
import { mergeUniqueById } from '../utils/collections';

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
    case 'APPEND_MONTH_DATA':
      return {
        ...state,
        workouts: mergeUniqueById(state.workouts, action.payload.workouts),
        painScores: mergeUniqueById(state.painScores, action.payload.painScores),
        sleepScores: mergeUniqueById(state.sleepScores, action.payload.sleepScores),
      };
    case 'MARK_MONTH_FETCHED': {
      const updated = new Set(state.fetchedMonths);
      updated.add(action.payload);
      return { ...state, fetchedMonths: updated };
    }
    default:
      return state;
  }
}
