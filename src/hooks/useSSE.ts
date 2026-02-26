import { useEffect, useRef, useCallback } from 'react';

export interface SSEMessage {
  type: string;
  [key: string]: unknown;
}

export interface UseSSEOptions<T extends SSEMessage = SSEMessage> {
  url: string | null;
  onMessage: (message: T) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  enabled?: boolean;
}

export interface UseSSEReturn {
  close: () => void;
  isConnected: boolean;
}

/**
 * Custom hook for Server-Sent Events (SSE) connections
 *
 * @param options Configuration options for the SSE connection
 * @returns Object with close function and connection state
 *
 * @example
 * ```tsx
 * const { close, isConnected } = useSSE({
 *   url: sessionId ? `/api/stream/${sessionId}` : null,
 *   onMessage: (message) => {
 *     if (message.type === 'data') {
 *       console.log(message.data);
 *     }
 *   },
 *   onError: (error) => console.error('SSE error:', error),
 * });
 * ```
 */
export function useSSE<T extends SSEMessage = SSEMessage>({
  url,
  onMessage,
  onError,
  onOpen,
  enabled = true,
}: UseSSEOptions<T>): UseSSEReturn {
  const eventSourceRef = useRef<EventSource | null>(null);
  const isConnectedRef = useRef<boolean>(false);

  const close = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      isConnectedRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Don't connect if disabled or no URL
    if (!enabled || !url) {
      return;
    }

    // Create EventSource connection
    const eventSource = new EventSource(url, {
      withCredentials: true,
    });

    eventSourceRef.current = eventSource;

    // Handle messages
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as T;
        onMessage(data);
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
        if (onError) {
          onError(err instanceof Error ? err : new Error('Failed to parse SSE message'));
        }
      }
    };

    // Handle connection open
    eventSource.onopen = () => {
      isConnectedRef.current = true;
      if (onOpen) {
        onOpen();
      }
    };

    // Handle errors
    eventSource.onerror = (event) => {
      console.error('SSE connection error:', event);
      isConnectedRef.current = false;

      if (onError) {
        onError(new Error('SSE connection error'));
      }

      // Close the connection on error
      eventSource.close();
    };

    // Cleanup on unmount or when dependencies change
    return () => {
      if (eventSource.readyState !== EventSource.CLOSED) {
        eventSource.close();
      }
      isConnectedRef.current = false;
    };
  }, [url, enabled, onMessage, onError, onOpen]);

  return {
    close,
    isConnected: isConnectedRef.current,
  };
}
