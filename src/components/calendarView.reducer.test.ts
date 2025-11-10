import { describe, it, expect } from 'vitest';
import { calendarReducer, createInitialCalendarState } from './calendarView.reducer';
import { Workout, PainScore, SleepScore } from '../types';

const makeState = () => createInitialCalendarState(new Date('2025-05-15'));

describe('calendarReducer', () => {
  describe('createInitialCalendarState', () => {
    it('creates initial state with provided date', () => {
      const testDate = new Date('2025-05-15');
      const state = createInitialCalendarState(testDate);

      expect(state.workouts).toEqual([]);
      expect(state.painScores).toEqual([]);
      expect(state.sleepScores).toEqual([]);
      expect(state.loading).toBe(true);
      expect(state.error).toBe(null);
      expect(state.currentMonth).toEqual(testDate);
      expect(state.fetchedMonths).toEqual(new Set());
    });

    it('creates initial state with default date when none provided', () => {
      const state = createInitialCalendarState();

      expect(state.workouts).toEqual([]);
      expect(state.loading).toBe(true);
      expect(state.currentMonth).toBeInstanceOf(Date);
    });
  });

  describe('SET_LOADING', () => {
    it('sets loading to true', () => {
      const state = makeState();
      const next = calendarReducer(state, { type: 'SET_LOADING', payload: true });

      expect(next.loading).toBe(true);
      expect(next).not.toBe(state); // immutability check
    });

    it('sets loading to false', () => {
      const state = { ...makeState(), loading: true };
      const next = calendarReducer(state, { type: 'SET_LOADING', payload: false });

      expect(next.loading).toBe(false);
    });
  });

  describe('SET_ERROR', () => {
    it('sets error message', () => {
      const state = makeState();
      const next = calendarReducer(state, {
        type: 'SET_ERROR',
        payload: 'Failed to fetch data',
      });

      expect(next.error).toBe('Failed to fetch data');
      expect(next).not.toBe(state);
    });

    it('clears error message', () => {
      const state = { ...makeState(), error: 'Some error' };
      const next = calendarReducer(state, { type: 'SET_ERROR', payload: null });

      expect(next.error).toBe(null);
    });
  });

  describe('SET_MONTH', () => {
    it('updates current month', () => {
      const state = makeState();
      const newMonth = new Date('2025-06-01');
      const next = calendarReducer(state, { type: 'SET_MONTH', payload: newMonth });

      expect(next.currentMonth).toEqual(newMonth);
      expect(next).not.toBe(state);
    });
  });

  describe('APPEND_MONTH_DATA', () => {
    it('appends new workouts, pain scores, and sleep scores', () => {
      const state = makeState();
      const next = calendarReducer(state, {
        type: 'APPEND_MONTH_DATA',
        payload: {
          monthKey: '2025-05',
          workouts: [
            {
              id: 1,
              userId: 1,
              date: '2025-05-10',
              withInstructor: true,
              exercises: [],
            } as Workout,
          ],
          painScores: [{ id: 10, userId: 1, date: '2025-05-11', score: 3 } as PainScore],
          sleepScores: [{ id: 20, userId: 1, date: '2025-05-12', score: 4 } as SleepScore],
        },
      });

      expect(next.workouts).toHaveLength(1);
      expect(next.workouts[0].id).toBe(1);
      expect(next.painScores).toHaveLength(1);
      expect(next.painScores[0].id).toBe(10);
      expect(next.sleepScores).toHaveLength(1);
      expect(next.sleepScores[0].id).toBe(20);
    });

    it('dedupes workouts when appending', () => {
      const state = {
        ...makeState(),
        workouts: [{ id: 1 } as Workout, { id: 2 } as Workout],
      };

      const next = calendarReducer(state, {
        type: 'APPEND_MONTH_DATA',
        payload: {
          monthKey: '2025-05',
          workouts: [{ id: 2 } as Workout, { id: 3 } as Workout],
          painScores: [],
          sleepScores: [],
        },
      });

      expect(next.workouts.map((w) => w.id)).toEqual([1, 2, 3]);
    });

    it('dedupes pain scores when appending', () => {
      const state = {
        ...makeState(),
        painScores: [{ id: 10 } as PainScore, { id: 11 } as PainScore],
      };

      const next = calendarReducer(state, {
        type: 'APPEND_MONTH_DATA',
        payload: {
          monthKey: '2025-05',
          workouts: [],
          painScores: [{ id: 11 } as PainScore, { id: 12 } as PainScore],
          sleepScores: [],
        },
      });

      expect(next.painScores.map((p) => p.id)).toEqual([10, 11, 12]);
    });

    it('dedupes sleep scores when appending', () => {
      const state = {
        ...makeState(),
        sleepScores: [{ id: 20 } as SleepScore, { id: 21 } as SleepScore],
      };

      const next = calendarReducer(state, {
        type: 'APPEND_MONTH_DATA',
        payload: {
          monthKey: '2025-05',
          workouts: [],
          painScores: [],
          sleepScores: [{ id: 21 } as SleepScore, { id: 22 } as SleepScore],
        },
      });

      expect(next.sleepScores.map((s) => s.id)).toEqual([20, 21, 22]);
    });

    it('handles empty arrays in payload', () => {
      const state = makeState();
      const next = calendarReducer(state, {
        type: 'APPEND_MONTH_DATA',
        payload: {
          monthKey: '2025-05',
          workouts: [],
          painScores: [],
          sleepScores: [],
        },
      });

      expect(next.workouts).toEqual([]);
      expect(next.painScores).toEqual([]);
      expect(next.sleepScores).toEqual([]);
    });

    it('preserves existing state when appending', () => {
      const state = {
        ...makeState(),
        loading: false,
        error: null,
        currentMonth: new Date('2025-05-15'),
      };

      const next = calendarReducer(state, {
        type: 'APPEND_MONTH_DATA',
        payload: {
          monthKey: '2025-05',
          workouts: [{ id: 1 } as Workout],
          painScores: [],
          sleepScores: [],
        },
      });

      expect(next.loading).toBe(false);
      expect(next.error).toBe(null);
      expect(next.currentMonth).toEqual(state.currentMonth);
    });
  });

  describe('MARK_MONTH_FETCHED', () => {
    it('marks a single month as fetched', () => {
      const state = makeState();
      const next = calendarReducer(state, { type: 'MARK_MONTH_FETCHED', payload: '2025-05' });

      expect(next.fetchedMonths.has('2025-05')).toBe(true);
      expect(next.fetchedMonths.size).toBe(1);
    });

    it('marks multiple months as fetched', () => {
      const state = makeState();
      const next1 = calendarReducer(state, { type: 'MARK_MONTH_FETCHED', payload: '2025-05' });
      const next2 = calendarReducer(next1, { type: 'MARK_MONTH_FETCHED', payload: '2025-06' });

      expect(next2.fetchedMonths.has('2025-05')).toBe(true);
      expect(next2.fetchedMonths.has('2025-06')).toBe(true);
      expect(next2.fetchedMonths.size).toBe(2);
    });

    it('handles marking the same month twice', () => {
      const state = makeState();
      const next1 = calendarReducer(state, { type: 'MARK_MONTH_FETCHED', payload: '2025-05' });
      const next2 = calendarReducer(next1, { type: 'MARK_MONTH_FETCHED', payload: '2025-05' });

      expect(next2.fetchedMonths.has('2025-05')).toBe(true);
      expect(next2.fetchedMonths.size).toBe(1);
    });

    it('creates new Set instance (immutability)', () => {
      const state = makeState();
      const next = calendarReducer(state, { type: 'MARK_MONTH_FETCHED', payload: '2025-05' });

      expect(next.fetchedMonths).not.toBe(state.fetchedMonths);
    });
  });

  describe('complex scenarios', () => {
    it('handles full workflow: load data, mark fetched, load more data', () => {
      const state = makeState();

      // Set loading
      const loading = calendarReducer(state, { type: 'SET_LOADING', payload: true });
      expect(loading.loading).toBe(true);

      // Append May data
      const withMayData = calendarReducer(loading, {
        type: 'APPEND_MONTH_DATA',
        payload: {
          monthKey: '2025-05',
          workouts: [{ id: 1 } as Workout],
          painScores: [{ id: 10 } as PainScore],
          sleepScores: [],
        },
      });

      // Mark May as fetched
      const mayFetched = calendarReducer(withMayData, {
        type: 'MARK_MONTH_FETCHED',
        payload: '2025-05',
      });

      // Stop loading
      const doneLoading = calendarReducer(mayFetched, { type: 'SET_LOADING', payload: false });

      expect(doneLoading.workouts).toHaveLength(1);
      expect(doneLoading.painScores).toHaveLength(1);
      expect(doneLoading.fetchedMonths.has('2025-05')).toBe(true);
      expect(doneLoading.loading).toBe(false);

      // Change month and load June data
      const june = calendarReducer(doneLoading, {
        type: 'SET_MONTH',
        payload: new Date('2025-06-01'),
      });

      const withJuneData = calendarReducer(june, {
        type: 'APPEND_MONTH_DATA',
        payload: {
          monthKey: '2025-06',
          workouts: [{ id: 2 } as Workout],
          painScores: [],
          sleepScores: [{ id: 20 } as SleepScore],
        },
      });

      expect(withJuneData.workouts.map((w) => w.id)).toEqual([1, 2]);
      expect(withJuneData.sleepScores).toHaveLength(1);
    });

    it('handles error during fetch', () => {
      const state = makeState();

      const loading = calendarReducer(state, { type: 'SET_LOADING', payload: true });
      const error = calendarReducer(loading, {
        type: 'SET_ERROR',
        payload: 'Network error',
      });
      const doneLoading = calendarReducer(error, { type: 'SET_LOADING', payload: false });

      expect(doneLoading.loading).toBe(false);
      expect(doneLoading.error).toBe('Network error');
      expect(doneLoading.workouts).toEqual([]);
    });
  });
});
