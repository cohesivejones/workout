/**
 * Utilities for working with collections in an immutable, order-preserving way.
 */

/**
 * Merge arrays while preserving order and removing duplicates by id.
 * Existing items are kept first; only unique incoming items are appended.
 */
export function mergeUniqueById<T extends { id: string | number }>(
  existing: T[],
  incoming: T[]
): T[] {
  if (incoming.length === 0) return existing.slice();
  if (existing.length === 0) {
    // Fast path: dedupe only the incoming list
    const seen = new Set<string | number>();
    const out: T[] = [];
    for (const item of incoming) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        out.push(item);
      }
    }
    return out;
  }

  const seen = new Set<string | number>(existing.map((e) => e.id));
  const out = existing.slice();
  for (const item of incoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

/**
 * Merge arrays while preserving order and removing duplicates by a composite key.
 * Existing items are kept first; only unique incoming items (by keyFn) are appended.
 */
export function mergeUniqueByKey<T>(existing: T[], incoming: T[], keyFn: (item: T) => string): T[] {
  if (incoming.length === 0) return existing.slice();
  if (existing.length === 0) {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of incoming) {
      const key = keyFn(item);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(item);
      }
    }
    return out;
  }

  const seen = new Set<string>(existing.map(keyFn));
  const out = existing.slice();
  for (const item of incoming) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}
