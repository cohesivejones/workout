import { useCallback, useEffect, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-run the async function. */
  refetch: () => Promise<void>;
  /** Imperatively replace the data (e.g. after a local mutation). */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * Runs an async function on mount and whenever `deps` change, tracking
 * loading/error/data. Collapses the repeated fetch+useState+useEffect
 * boilerplate that pages hand-rolled.
 *
 *   const { data, loading, error, refetch } = useAsync(() => fetchThing(id), [id]);
 *
 * Pass `enabled: false` (via options) to skip auto-running (e.g. when not
 * logged in); call `refetch()` to run manually.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList,
  options: { enabled?: boolean; errorMessage?: string } = {}
): AsyncState<T> {
  const { enabled = true, errorMessage = 'Failed to load data. Please try again later.' } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      setData(result);
    } catch (err) {
      console.error(errorMessage, err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    run();
  }, [enabled, run]);

  return { data, loading, error, refetch: run, setData };
}

export default useAsync;
