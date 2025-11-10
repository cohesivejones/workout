import { describe, it, expect } from 'vitest';
import { mergeUniqueById, mergeUniqueByKey } from './collections';

describe('collections utilities', () => {
  describe('mergeUniqueById', () => {
    it('returns empty array when both inputs are empty', () => {
      const result = mergeUniqueById([], []);
      expect(result).toEqual([]);
      expect(result).not.toBe([]); // should be a new array
    });

    it('returns a copy of existing when incoming is empty', () => {
      const existing = [{ id: 1, name: 'Item 1' }];
      const result = mergeUniqueById(existing, []);
      expect(result).toEqual(existing);
      expect(result).not.toBe(existing); // immutability check
    });

    it('returns deduped incoming when existing is empty', () => {
      const incoming = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 1, name: 'A-dupe' }, // duplicate id
      ];
      const result = mergeUniqueById([], incoming);
      expect(result).toEqual([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ]);
    });

    it('preserves order: existing items first, then unique incoming', () => {
      const existing = [
        { id: 1, name: 'Existing 1' },
        { id: 2, name: 'Existing 2' },
      ];
      const incoming = [
        { id: 3, name: 'New 3' },
        { id: 4, name: 'New 4' },
      ];
      const result = mergeUniqueById(existing, incoming);
      expect(result).toEqual([
        { id: 1, name: 'Existing 1' },
        { id: 2, name: 'Existing 2' },
        { id: 3, name: 'New 3' },
        { id: 4, name: 'New 4' },
      ]);
    });

    it('filters out incoming items with duplicate ids', () => {
      const existing = [
        { id: 1, name: 'Existing 1' },
        { id: 2, name: 'Existing 2' },
      ];
      const incoming = [
        { id: 2, name: 'Duplicate 2' }, // duplicate
        { id: 3, name: 'New 3' },
        { id: 1, name: 'Duplicate 1' }, // duplicate
      ];
      const result = mergeUniqueById(existing, incoming);
      expect(result).toEqual([
        { id: 1, name: 'Existing 1' },
        { id: 2, name: 'Existing 2' },
        { id: 3, name: 'New 3' },
      ]);
    });

    it('does not mutate original arrays', () => {
      const existing = [{ id: 1, name: 'A' }];
      const incoming = [{ id: 2, name: 'B' }];
      const existingCopy = [...existing];
      const incomingCopy = [...incoming];

      mergeUniqueById(existing, incoming);

      expect(existing).toEqual(existingCopy);
      expect(incoming).toEqual(incomingCopy);
    });

    it('handles string ids', () => {
      const existing = [{ id: 'a', value: 1 }];
      const incoming = [
        { id: 'b', value: 2 },
        { id: 'a', value: 3 }, // duplicate
      ];
      const result = mergeUniqueById(existing, incoming);
      expect(result).toEqual([
        { id: 'a', value: 1 },
        { id: 'b', value: 2 },
      ]);
    });

    it('handles mixed string and number ids', () => {
      type Item = { id: string | number; name: string };
      const existing: Item[] = [{ id: 1, name: 'Numeric' }];
      const incoming: Item[] = [{ id: '1', name: 'String' }]; // Different type, considered unique
      const result = mergeUniqueById(existing, incoming);
      // Both should be included as '1' (string) and 1 (number) are different keys in Set
      expect(result).toEqual([
        { id: 1, name: 'Numeric' },
        { id: '1', name: 'String' },
      ]);
    });

    it('handles large arrays efficiently', () => {
      const existing = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: i }));
      const incoming = Array.from({ length: 1000 }, (_, i) => ({ id: i + 500, value: i + 500 }));
      const result = mergeUniqueById(existing, incoming);
      // Should have 1500 unique items (0-999 from existing, 1000-1499 from incoming)
      expect(result.length).toBe(1500);
      expect(result[0]).toEqual({ id: 0, value: 0 });
      expect(result[999]).toEqual({ id: 999, value: 999 });
      expect(result[1499]).toEqual({ id: 1499, value: 1499 });
    });
  });

  describe('mergeUniqueByKey', () => {
    it('returns empty array when both inputs are empty', () => {
      const result = mergeUniqueByKey<{ key: string }>([], [], (item) => item.key);
      expect(result).toEqual([]);
    });

    it('returns a copy of existing when incoming is empty', () => {
      const existing = [{ type: 'workout', id: 1 }];
      const result = mergeUniqueByKey(existing, [], (item) => `${item.type}-${item.id}`);
      expect(result).toEqual(existing);
      expect(result).not.toBe(existing);
    });

    it('returns deduped incoming when existing is empty', () => {
      const incoming = [
        { type: 'workout', id: 1, name: 'A' },
        { type: 'workout', id: 2, name: 'B' },
        { type: 'workout', id: 1, name: 'A-dupe' }, // duplicate key
      ];
      const result = mergeUniqueByKey([], incoming, (item) => `${item.type}-${item.id}`);
      expect(result).toEqual([
        { type: 'workout', id: 1, name: 'A' },
        { type: 'workout', id: 2, name: 'B' },
      ]);
    });

    it('preserves order: existing items first, then unique incoming', () => {
      const existing = [
        { type: 'workout', id: 1 },
        { type: 'pain', id: 1 },
      ];
      const incoming = [
        { type: 'sleep', id: 1 },
        { type: 'workout', id: 2 },
      ];
      const result = mergeUniqueByKey(existing, incoming, (item) => `${item.type}-${item.id}`);
      expect(result).toEqual([
        { type: 'workout', id: 1 },
        { type: 'pain', id: 1 },
        { type: 'sleep', id: 1 },
        { type: 'workout', id: 2 },
      ]);
    });

    it('filters out incoming items with duplicate composite keys', () => {
      type ActivityItem =
        | { type: 'workout'; id: number; name: string }
        | { type: 'pain'; id: number; score: number }
        | { type: 'sleep'; id: number; hours: number };

      const existing: ActivityItem[] = [
        { type: 'workout', id: 1, name: 'Existing' },
        { type: 'pain', id: 1, score: 5 },
      ];
      const incoming: ActivityItem[] = [
        { type: 'workout', id: 1, name: 'Duplicate' }, // duplicate key
        { type: 'sleep', id: 1, hours: 8 }, // unique key
        { type: 'pain', id: 1, score: 3 }, // duplicate key
      ];
      const result = mergeUniqueByKey(existing, incoming, (item) => `${item.type}-${item.id}`);
      expect(result).toEqual([
        { type: 'workout', id: 1, name: 'Existing' },
        { type: 'pain', id: 1, score: 5 },
        { type: 'sleep', id: 1, hours: 8 },
      ]);
    });

    it('does not mutate original arrays', () => {
      const existing = [{ type: 'workout', id: 1 }];
      const incoming = [{ type: 'pain', id: 1 }];
      const existingCopy = [...existing];
      const incomingCopy = [...incoming];

      mergeUniqueByKey(existing, incoming, (item) => `${item.type}-${item.id}`);

      expect(existing).toEqual(existingCopy);
      expect(incoming).toEqual(incomingCopy);
    });

    it('uses custom key function correctly', () => {
      const existing = [{ x: 1, y: 1, value: 'A' }];
      const incoming = [
        { x: 1, y: 2, value: 'B' }, // unique
        { x: 1, y: 1, value: 'C' }, // duplicate
        { x: 2, y: 1, value: 'D' }, // unique
      ];
      const result = mergeUniqueByKey(existing, incoming, (item) => `${item.x},${item.y}`);
      expect(result).toEqual([
        { x: 1, y: 1, value: 'A' },
        { x: 1, y: 2, value: 'B' },
        { x: 2, y: 1, value: 'D' },
      ]);
    });

    it('handles empty string keys', () => {
      const existing = [{ type: '', id: 0 }];
      const incoming = [
        { type: '', id: 0 }, // duplicate
        { type: '', id: 1 }, // unique
      ];
      const result = mergeUniqueByKey(existing, incoming, (item) => `${item.type}-${item.id}`);
      expect(result).toEqual([
        { type: '', id: 0 },
        { type: '', id: 1 },
      ]);
    });

    it('handles large arrays with composite keys efficiently', () => {
      const existing = Array.from({ length: 500 }, (_, i) => ({ type: 'workout', id: i }));
      const incoming = Array.from({ length: 500 }, (_, i) => ({
        type: i < 250 ? 'workout' : 'pain',
        id: i,
      }));
      const result = mergeUniqueByKey(existing, incoming, (item) => `${item.type}-${item.id}`);
      // First 500 from existing (workout 0-499)
      // Then 250 unique from incoming (pain 250-499)
      // workout 0-249 in incoming are duplicates
      expect(result.length).toBe(750);
      expect(result.filter((item) => item.type === 'workout').length).toBe(500);
      expect(result.filter((item) => item.type === 'pain').length).toBe(250);
    });
  });
});
