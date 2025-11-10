import { describe, it, expect } from 'vitest';
import { listViewReducer, createInitialListViewState } from './listView.reducer';
import { ActivityItem } from '../types';

describe('listViewReducer', () => {
  describe('createInitialListViewState', () => {
    it('creates initial state with correct defaults', () => {
      const state = createInitialListViewState();

      expect(state.activityItems).toEqual([]);
      expect(state.loading).toBe(true);
      expect(state.error).toBe(null);
      expect(state.currentOffset).toBe(0);
      expect(state.isLoadingMore).toBe(false);
      expect(state.totalCount).toBe(0);
      expect(state.showWorkouts).toBe(true);
      expect(state.showPainScores).toBe(true);
      expect(state.showSleepScores).toBe(true);
      expect(state.isDeleting).toBe(null);
      expect(state.fabOpen).toBe(false);
    });
  });

  describe('SET_LOADING', () => {
    it('sets loading to true', () => {
      const state = createInitialListViewState();
      const next = listViewReducer(state, { type: 'SET_LOADING', payload: true });

      expect(next.loading).toBe(true);
      expect(next).not.toBe(state);
    });

    it('sets loading to false', () => {
      const state = { ...createInitialListViewState(), loading: true };
      const next = listViewReducer(state, { type: 'SET_LOADING', payload: false });

      expect(next.loading).toBe(false);
    });
  });

  describe('SET_ERROR', () => {
    it('sets error message', () => {
      const state = createInitialListViewState();
      const next = listViewReducer(state, {
        type: 'SET_ERROR',
        payload: 'Failed to load data',
      });

      expect(next.error).toBe('Failed to load data');
      expect(next).not.toBe(state);
    });

    it('clears error message', () => {
      const state = { ...createInitialListViewState(), error: 'Some error' };
      const next = listViewReducer(state, { type: 'SET_ERROR', payload: null });

      expect(next.error).toBe(null);
    });
  });

  describe('SET_LOADING_MORE', () => {
    it('sets isLoadingMore to true', () => {
      const state = createInitialListViewState();
      const next = listViewReducer(state, { type: 'SET_LOADING_MORE', payload: true });

      expect(next.isLoadingMore).toBe(true);
    });

    it('sets isLoadingMore to false', () => {
      const state = { ...createInitialListViewState(), isLoadingMore: true };
      const next = listViewReducer(state, { type: 'SET_LOADING_MORE', payload: false });

      expect(next.isLoadingMore).toBe(false);
    });
  });

  describe('SET_DELETING', () => {
    it('sets deleting state with type and id', () => {
      const state = createInitialListViewState();
      const next = listViewReducer(state, {
        type: 'SET_DELETING',
        payload: { type: 'workout', id: 1 },
      });

      expect(next.isDeleting).toEqual({ type: 'workout', id: 1 });
    });

    it('clears deleting state', () => {
      const state = {
        ...createInitialListViewState(),
        isDeleting: { type: 'workout', id: 1 },
      };
      const next = listViewReducer(state, { type: 'SET_DELETING', payload: null });

      expect(next.isDeleting).toBe(null);
    });
  });

  describe('SET_FAB_OPEN', () => {
    it('sets FAB to open', () => {
      const state = createInitialListViewState();
      const next = listViewReducer(state, { type: 'SET_FAB_OPEN', payload: true });

      expect(next.fabOpen).toBe(true);
    });

    it('sets FAB to closed', () => {
      const state = { ...createInitialListViewState(), fabOpen: true };
      const next = listViewReducer(state, { type: 'SET_FAB_OPEN', payload: false });

      expect(next.fabOpen).toBe(false);
    });
  });

  describe('LOAD_INITIAL_DATA', () => {
    it('loads initial data correctly', () => {
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
      ];

      const next = listViewReducer(state, {
        type: 'LOAD_INITIAL_DATA',
        payload: { items, total: 2 },
      });

      expect(next.activityItems).toHaveLength(2);
      expect(next.activityItems).toEqual(items);
      expect(next.totalCount).toBe(2);
      expect(next.loading).toBe(false);
      expect(next.currentOffset).toBe(0);
    });

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

    it('handles empty initial data', () => {
      const state = createInitialListViewState();
      const next = listViewReducer(state, {
        type: 'LOAD_INITIAL_DATA',
        payload: { items: [], total: 0 },
      });

      expect(next.activityItems).toEqual([]);
      expect(next.totalCount).toBe(0);
      expect(next.loading).toBe(false);
    });
  });

  describe('APPEND_DATA', () => {
    it('appends new items correctly', () => {
      const state = createInitialListViewState();

      const initialItems: ActivityItem[] = [
        {
          type: 'workout',
          id: 1,
          date: '2025-05-01',
          workout: { id: 1, userId: 1, date: '2025-05-01', withInstructor: true, exercises: [] },
        },
      ];

      const stateWithData = listViewReducer(state, {
        type: 'LOAD_INITIAL_DATA',
        payload: { items: initialItems, total: 3 },
      });

      const newItems: ActivityItem[] = [
        {
          type: 'painScore',
          id: 2,
          date: '2025-04-30',
          painScore: { id: 2, userId: 1, date: '2025-04-30', score: 3, notes: null },
        },
        {
          type: 'sleepScore',
          id: 3,
          date: '2025-04-29',
          sleepScore: { id: 3, userId: 1, date: '2025-04-29', score: 4, notes: null },
        },
      ];

      const next = listViewReducer(stateWithData, {
        type: 'APPEND_DATA',
        payload: { items: newItems, total: 3 },
      });

      expect(next.activityItems).toHaveLength(3);
      expect(next.activityItems[0].id).toBe(1);
      expect(next.activityItems[1].id).toBe(2);
      expect(next.activityItems[2].id).toBe(3);
      expect(next.currentOffset).toBe(1);
      expect(next.isLoadingMore).toBe(false);
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

    it('handles appending empty data', () => {
      const state = createInitialListViewState();

      const initialItems: ActivityItem[] = [
        {
          type: 'workout',
          id: 1,
          date: '2025-05-01',
          workout: { id: 1, userId: 1, date: '2025-05-01', withInstructor: true, exercises: [] },
        },
      ];

      const stateWithData = listViewReducer(state, {
        type: 'LOAD_INITIAL_DATA',
        payload: { items: initialItems, total: 1 },
      });

      const next = listViewReducer(stateWithData, {
        type: 'APPEND_DATA',
        payload: { items: [], total: 1 },
      });

      expect(next.activityItems).toHaveLength(1);
      expect(next.currentOffset).toBe(1);
    });
  });

  describe('DELETE_ITEM', () => {
    it('deletes workout item correctly', () => {
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

    it('deletes pain score item correctly', () => {
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
      ];

      const stateWithData = listViewReducer(state, {
        type: 'LOAD_INITIAL_DATA',
        payload: { items, total: 2 },
      });

      const next = listViewReducer(stateWithData, {
        type: 'DELETE_ITEM',
        payload: { type: 'painScore', id: 2 },
      });

      expect(next.activityItems).toHaveLength(1);
      expect(next.activityItems.find((i) => i.type === 'painScore' && i.id === 2)).toBeUndefined();
    });

    it('deletes sleep score item correctly', () => {
      const state = createInitialListViewState();

      const items: ActivityItem[] = [
        {
          type: 'sleepScore',
          id: 1,
          date: '2025-05-01',
          sleepScore: { id: 1, userId: 1, date: '2025-05-01', score: 4, notes: null },
        },
        {
          type: 'workout',
          id: 2,
          date: '2025-05-02',
          workout: { id: 2, userId: 1, date: '2025-05-02', withInstructor: true, exercises: [] },
        },
      ];

      const stateWithData = listViewReducer(state, {
        type: 'LOAD_INITIAL_DATA',
        payload: { items, total: 2 },
      });

      const next = listViewReducer(stateWithData, {
        type: 'DELETE_ITEM',
        payload: { type: 'sleepScore', id: 1 },
      });

      expect(next.activityItems).toHaveLength(1);
      expect(next.activityItems.find((i) => i.type === 'sleepScore' && i.id === 1)).toBeUndefined();
    });

    it('handles deleting non-existent item', () => {
      const state = createInitialListViewState();

      const items: ActivityItem[] = [
        {
          type: 'workout',
          id: 1,
          date: '2025-05-01',
          workout: { id: 1, userId: 1, date: '2025-05-01', withInstructor: true, exercises: [] },
        },
      ];

      const stateWithData = listViewReducer(state, {
        type: 'LOAD_INITIAL_DATA',
        payload: { items, total: 1 },
      });

      const next = listViewReducer(stateWithData, {
        type: 'DELETE_ITEM',
        payload: { type: 'workout', id: 999 },
      });

      expect(next.activityItems).toHaveLength(1);
    });
  });

  describe('TOGGLE_FILTER', () => {
    it('toggles workouts filter', () => {
      const state = createInitialListViewState();
      const next = listViewReducer(state, { type: 'TOGGLE_FILTER', payload: 'workouts' });

      expect(next.showWorkouts).toBe(false);
      expect(next.showPainScores).toBe(true);
      expect(next.showSleepScores).toBe(true);
    });

    it('toggles pain scores filter', () => {
      const state = createInitialListViewState();
      const next = listViewReducer(state, { type: 'TOGGLE_FILTER', payload: 'painScores' });

      expect(next.showWorkouts).toBe(true);
      expect(next.showPainScores).toBe(false);
      expect(next.showSleepScores).toBe(true);
    });

    it('toggles sleep scores filter', () => {
      const state = createInitialListViewState();
      const next = listViewReducer(state, { type: 'TOGGLE_FILTER', payload: 'sleepScores' });

      expect(next.showWorkouts).toBe(true);
      expect(next.showPainScores).toBe(true);
      expect(next.showSleepScores).toBe(false);
    });

    it('toggles filter back on', () => {
      const state = { ...createInitialListViewState(), showWorkouts: false };
      const next = listViewReducer(state, { type: 'TOGGLE_FILTER', payload: 'workouts' });

      expect(next.showWorkouts).toBe(true);
    });
  });

  describe('SHOW_ALL_FILTERS', () => {
    it('enables all filters', () => {
      const state = {
        ...createInitialListViewState(),
        showWorkouts: false,
        showPainScores: false,
        showSleepScores: false,
      };

      const next = listViewReducer(state, { type: 'SHOW_ALL_FILTERS' });

      expect(next.showWorkouts).toBe(true);
      expect(next.showPainScores).toBe(true);
      expect(next.showSleepScores).toBe(true);
    });

    it('keeps filters enabled if already enabled', () => {
      const state = createInitialListViewState();
      const next = listViewReducer(state, { type: 'SHOW_ALL_FILTERS' });

      expect(next.showWorkouts).toBe(true);
      expect(next.showPainScores).toBe(true);
      expect(next.showSleepScores).toBe(true);
    });
  });

  describe('complex scenarios', () => {
    it('handles full data loading workflow', () => {
      const state = createInitialListViewState();

      // Set loading
      const loading = listViewReducer(state, { type: 'SET_LOADING', payload: true });
      expect(loading.loading).toBe(true);

      // Load initial data
      const items: ActivityItem[] = [
        {
          type: 'workout',
          id: 1,
          date: '2025-05-01',
          workout: { id: 1, userId: 1, date: '2025-05-01', withInstructor: true, exercises: [] },
        },
      ];

      const withData = listViewReducer(loading, {
        type: 'LOAD_INITIAL_DATA',
        payload: { items, total: 2 },
      });

      expect(withData.activityItems).toHaveLength(1);
      expect(withData.loading).toBe(false);
      expect(withData.totalCount).toBe(2);

      // Load more
      const loadingMore = listViewReducer(withData, { type: 'SET_LOADING_MORE', payload: true });

      const moreItems: ActivityItem[] = [
        {
          type: 'painScore',
          id: 2,
          date: '2025-04-30',
          painScore: { id: 2, userId: 1, date: '2025-04-30', score: 3, notes: null },
        },
      ];

      const withMoreData = listViewReducer(loadingMore, {
        type: 'APPEND_DATA',
        payload: { items: moreItems, total: 2 },
      });

      expect(withMoreData.activityItems).toHaveLength(2);
      expect(withMoreData.currentOffset).toBe(1);
      expect(withMoreData.isLoadingMore).toBe(false);
    });

    it('handles delete workflow', () => {
      const state = createInitialListViewState();

      const items: ActivityItem[] = [
        {
          type: 'workout',
          id: 1,
          date: '2025-05-01',
          workout: { id: 1, userId: 1, date: '2025-05-01', withInstructor: true, exercises: [] },
        },
      ];

      const withData = listViewReducer(state, {
        type: 'LOAD_INITIAL_DATA',
        payload: { items, total: 1 },
      });

      // Set deleting state
      const deleting = listViewReducer(withData, {
        type: 'SET_DELETING',
        payload: { type: 'workout', id: 1 },
      });

      expect(deleting.isDeleting).toEqual({ type: 'workout', id: 1 });

      // Delete item
      const deleted = listViewReducer(deleting, {
        type: 'DELETE_ITEM',
        payload: { type: 'workout', id: 1 },
      });

      expect(deleted.activityItems).toHaveLength(0);

      // Clear deleting state
      const cleared = listViewReducer(deleted, {
        type: 'SET_DELETING',
        payload: null,
      });

      expect(cleared.isDeleting).toBe(null);
    });

    it('handles filter workflow', () => {
      const state = createInitialListViewState();

      // Toggle all filters off
      const noWorkouts = listViewReducer(state, { type: 'TOGGLE_FILTER', payload: 'workouts' });
      const noPain = listViewReducer(noWorkouts, { type: 'TOGGLE_FILTER', payload: 'painScores' });
      const noSleep = listViewReducer(noPain, { type: 'TOGGLE_FILTER', payload: 'sleepScores' });

      expect(noSleep.showWorkouts).toBe(false);
      expect(noSleep.showPainScores).toBe(false);
      expect(noSleep.showSleepScores).toBe(false);

      // Show all
      const allVisible = listViewReducer(noSleep, { type: 'SHOW_ALL_FILTERS' });

      expect(allVisible.showWorkouts).toBe(true);
      expect(allVisible.showPainScores).toBe(true);
      expect(allVisible.showSleepScores).toBe(true);
    });

    it('handles error scenario', () => {
      const state = createInitialListViewState();

      const loading = listViewReducer(state, { type: 'SET_LOADING', payload: true });
      const error = listViewReducer(loading, {
        type: 'SET_ERROR',
        payload: 'Network error',
      });
      const doneLoading = listViewReducer(error, { type: 'SET_LOADING', payload: false });

      expect(doneLoading.loading).toBe(false);
      expect(doneLoading.error).toBe('Network error');
      expect(doneLoading.activityItems).toEqual([]);
    });

    it('handles FAB workflow', () => {
      const state = createInitialListViewState();

      const opened = listViewReducer(state, { type: 'SET_FAB_OPEN', payload: true });
      expect(opened.fabOpen).toBe(true);

      const closed = listViewReducer(opened, { type: 'SET_FAB_OPEN', payload: false });
      expect(closed.fabOpen).toBe(false);
    });
  });
});
