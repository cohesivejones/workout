import { describe, it, expect } from 'vitest';
import { listViewReducer, createInitialListViewState } from './listView.reducer';
import { ActivityItem } from '../types';

describe('listViewReducer', () => {
  it('deduplicates items when loading initial data', () => {
    const state = createInitialListViewState();

    const items: ActivityItem[] = [
      {
        type: 'workout',
        id: 1,
        date: '2025-05-01',
        workout: { id: 1, userId: 1, date: '2025-05-01', withInstructor: true, exercises: [] },
      },
      {
        type: 'workout',
        id: 1,
        date: '2025-05-01',
        workout: { id: 1, userId: 1, date: '2025-05-01', withInstructor: true, exercises: [] },
      }, // duplicate
      {
        type: 'painScore',
        id: 2,
        date: '2025-05-02',
        painScore: { id: 2, userId: 1, date: '2025-05-02', score: 3, notes: null },
      },
    ];

    const next = listViewReducer(state, {
      type: 'LOAD_INITIAL_DATA',
      payload: { items, total: 2 },
    });

    expect(next.activityItems).toHaveLength(2);
    expect(next.activityItems[0].id).toBe(1);
    expect(next.activityItems[1].id).toBe(2);
    expect(next.totalCount).toBe(2);
    expect(next.loading).toBe(false);
  });

  it('deduplicates items when appending data', () => {
    const state = createInitialListViewState();

    const initialItems: ActivityItem[] = [
      {
        type: 'workout',
        id: 1,
        date: '2025-05-01',
        workout: { id: 1, userId: 1, date: '2025-05-01', withInstructor: true, exercises: [] },
      },
      {
        type: 'painScore',
        id: 2,
        date: '2025-05-02',
        painScore: { id: 2, userId: 1, date: '2025-05-02', score: 3, notes: null },
      },
    ];

    const stateWithData = listViewReducer(state, {
      type: 'LOAD_INITIAL_DATA',
      payload: { items: initialItems, total: 4 },
    });

    const newItems: ActivityItem[] = [
      {
        type: 'workout',
        id: 1,
        date: '2025-05-01',
        workout: { id: 1, userId: 1, date: '2025-05-01', withInstructor: true, exercises: [] },
      }, // duplicate
      {
        type: 'sleepScore',
        id: 3,
        date: '2025-04-30',
        sleepScore: { id: 3, userId: 1, date: '2025-04-30', score: 4, notes: null },
      },
      {
        type: 'workout',
        id: 4,
        date: '2025-04-29',
        workout: { id: 4, userId: 1, date: '2025-04-29', withInstructor: false, exercises: [] },
      },
    ];

    const next = listViewReducer(stateWithData, {
      type: 'APPEND_DATA',
      payload: { items: newItems, total: 4 },
    });

    // Should have original 2 + new 2 (excluding duplicate workout-1)
    expect(next.activityItems).toHaveLength(4);
    expect(next.activityItems.map((i) => `${i.type}-${i.id}`).sort()).toEqual(
      ['painScore-2', 'sleepScore-3', 'workout-1', 'workout-4'].sort()
    );
    expect(next.currentOffset).toBe(1);
    expect(next.isLoadingMore).toBe(false);
  });

  it('deletes items correctly', () => {
    const state = createInitialListViewState();

    const items: ActivityItem[] = [
      {
        type: 'workout',
        id: 1,
        date: '2025-05-01',
        workout: { id: 1, userId: 1, date: '2025-05-01', withInstructor: true, exercises: [] },
      },
      {
        type: 'painScore',
        id: 2,
        date: '2025-05-02',
        painScore: { id: 2, userId: 1, date: '2025-05-02', score: 3, notes: null },
      },
      {
        type: 'workout',
        id: 3,
        date: '2025-05-03',
        workout: { id: 3, userId: 1, date: '2025-05-03', withInstructor: false, exercises: [] },
      },
    ];

    const stateWithData = listViewReducer(state, {
      type: 'LOAD_INITIAL_DATA',
      payload: { items, total: 3 },
    });

    const next = listViewReducer(stateWithData, {
      type: 'DELETE_ITEM',
      payload: { type: 'workout', id: 1 },
    });

    expect(next.activityItems).toHaveLength(2);
    expect(next.activityItems.find((i) => i.type === 'workout' && i.id === 1)).toBeUndefined();
    expect(next.activityItems.find((i) => i.type === 'painScore' && i.id === 2)).toBeDefined();
    expect(next.activityItems.find((i) => i.type === 'workout' && i.id === 3)).toBeDefined();
  });

  it('toggles filters correctly', () => {
    const state = createInitialListViewState();

    // Toggle workouts off
    const next1 = listViewReducer(state, { type: 'TOGGLE_FILTER', payload: 'workouts' });
    expect(next1.showWorkouts).toBe(false);
    expect(next1.showPainScores).toBe(true);
    expect(next1.showSleepScores).toBe(true);

    // Toggle pain scores off
    const next2 = listViewReducer(next1, { type: 'TOGGLE_FILTER', payload: 'painScores' });
    expect(next2.showWorkouts).toBe(false);
    expect(next2.showPainScores).toBe(false);
    expect(next2.showSleepScores).toBe(true);

    // Show all
    const next3 = listViewReducer(next2, { type: 'SHOW_ALL_FILTERS' });
    expect(next3.showWorkouts).toBe(true);
    expect(next3.showPainScores).toBe(true);
    expect(next3.showSleepScores).toBe(true);
  });
});
