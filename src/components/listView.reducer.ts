import { ActivityItem } from '../types';
import { mergeUniqueByKey } from '../utils/collections';

export type ListViewState = {
  activityItems: ActivityItem[];
  loading: boolean;
  error: string | null;
  currentOffset: number;
  isLoadingMore: boolean;
  totalCount: number;
  showWorkouts: boolean;
  showPainScores: boolean;
  showSleepScores: boolean;
  isDeleting: { type: string; id: number } | null;
  fabOpen: boolean;
};

export type ListViewAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LOADING_MORE'; payload: boolean }
  | { type: 'SET_FAB_OPEN'; payload: boolean }
  | { type: 'SET_DELETING'; payload: { type: string; id: number } | null }
  | { type: 'TOGGLE_FILTER'; payload: 'workouts' | 'painScores' | 'sleepScores' }
  | { type: 'SHOW_ALL_FILTERS' }
  | {
      type: 'LOAD_INITIAL_DATA';
      payload: { items: ActivityItem[]; total: number };
    }
  | {
      type: 'APPEND_DATA';
      payload: { items: ActivityItem[]; total?: number };
    }
  | { type: 'DELETE_ITEM'; payload: { type: string; id: number } };

export function createInitialListViewState(): ListViewState {
  return {
    activityItems: [],
    loading: true,
    error: null,
    currentOffset: 0,
    isLoadingMore: false,
    totalCount: 0,
    showWorkouts: true,
    showPainScores: true,
    showSleepScores: true,
    isDeleting: null,
    fabOpen: false,
  };
}

export function listViewReducer(state: ListViewState, action: ListViewAction): ListViewState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_LOADING_MORE':
      return { ...state, isLoadingMore: action.payload };
    case 'SET_FAB_OPEN':
      return { ...state, fabOpen: action.payload };
    case 'SET_DELETING':
      return { ...state, isDeleting: action.payload };
    case 'TOGGLE_FILTER': {
      // Map the payload to the corresponding state key and toggle it
      const keyMap = {
        workouts: 'showWorkouts',
        painScores: 'showPainScores',
        sleepScores: 'showSleepScores',
      } as const;
      const key = keyMap[action.payload];
      return { ...state, [key]: !state[key] } as ListViewState;
    }
    case 'SHOW_ALL_FILTERS':
      return {
        ...state,
        showWorkouts: true,
        showPainScores: true,
        showSleepScores: true,
      };
    case 'LOAD_INITIAL_DATA':
      return {
        ...state,
        activityItems: mergeUniqueByKey(
          state.activityItems,
          action.payload.items,
          (i) => `${i.type}-${i.id}`
        ),
        totalCount: action.payload.total,
        currentOffset: 0,
        loading: false,
        error: null,
      };
    case 'APPEND_DATA':
      return {
        ...state,
        activityItems: mergeUniqueByKey(
          state.activityItems,
          action.payload.items,
          (i) => `${i.type}-${i.id}`
        ),
        currentOffset: state.currentOffset + 1,
        totalCount: action.payload.total ?? state.totalCount,
        isLoadingMore: false,
      };
    case 'DELETE_ITEM': {
      return {
        ...state,
        activityItems: state.activityItems.filter(
          (item) => !(item.type === action.payload.type && item.id === action.payload.id)
        ),
        isDeleting: null,
      };
    }
    default:
      return state;
  }
}
