import { describe, it, expect } from 'vitest';
import { calendarReducer, createInitialCalendarState } from './calendarView.reducer';
import { Workout, PainScore, SleepScore } from '../types';

const makeState = () => createInitialCalendarState(new Date('2025-05-15'));

describe('calendarReducer', () => {
  it('dedupes workouts, pain scores, and sleep scores when appending month data', () => {
    const state1 = makeState();
    const next1 = calendarReducer(state1, {
      type: 'APPEND_MONTH_DATA',
      payload: {
        monthKey: '2025-05',
        workouts: [{ id: 1 } as Workout, { id: 2 } as Workout],
        painScores: [{ id: 10 } as PainScore],
        sleepScores: [{ id: 20 } as SleepScore],
      },
    });

    expect(next1.workouts.map((w) => w.id)).toEqual([1, 2]);

    const next2 = calendarReducer(next1, {
      type: 'APPEND_MONTH_DATA',
      payload: {
        monthKey: '2025-05',
        workouts: [{ id: 2 } as Workout, { id: 3 } as Workout],
        painScores: [{ id: 10 } as PainScore, { id: 11 } as PainScore],
        sleepScores: [{ id: 21 } as SleepScore, { id: 20 } as SleepScore],
      },
    });

    expect(next2.workouts.map((w) => w.id)).toEqual([1, 2, 3]);
    expect(next2.painScores.map((p) => p.id)).toEqual([10, 11]);
    expect(next2.sleepScores.map((s) => s.id)).toEqual([20, 21]);
  });

  it('marks months as fetched', () => {
    const state = makeState();
    const next = calendarReducer(state, { type: 'MARK_MONTH_FETCHED', payload: '2025-05' });
    expect(next.fetchedMonths.has('2025-05')).toBe(true);
  });
});
