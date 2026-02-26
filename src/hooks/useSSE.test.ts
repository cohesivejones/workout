/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSSE } from './useSSE';

// Mock EventSource
class MockEventSource {
  url: string;
  withCredentials: boolean;
  readyState: number = 0; // CONNECTING
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = options?.withCredentials ?? false;
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  // Test helpers
  simulateOpen() {
    this.readyState = MockEventSource.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data),
      });
      this.onmessage(event);
    }
  }

  simulateError() {
    this.readyState = MockEventSource.CLOSED;
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

let mockEventSource: MockEventSource | null = null;

describe('useSSE', () => {
  beforeEach(() => {
    mockEventSource = null;

    // Mock EventSource globally
    global.EventSource = vi.fn((url: string, options?: { withCredentials?: boolean }) => {
      mockEventSource = new MockEventSource(url, options);
      return mockEventSource as unknown as EventSource;
    }) as unknown as typeof EventSource;

    // Add static properties
    Object.defineProperty(global.EventSource, 'CONNECTING', { value: 0, writable: false });
    Object.defineProperty(global.EventSource, 'OPEN', { value: 1, writable: false });
    Object.defineProperty(global.EventSource, 'CLOSED', { value: 2, writable: false });
  });

  afterEach(() => {
    if (mockEventSource) {
      mockEventSource.close();
    }
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should not create EventSource when url is null', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useSSE({
          url: null,
          onMessage,
        })
      );

      expect(global.EventSource).not.toHaveBeenCalled();
    });

    it('should not create EventSource when enabled is false', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/stream/123',
          onMessage,
          enabled: false,
        })
      );

      expect(global.EventSource).not.toHaveBeenCalled();
    });

    it('should create EventSource with correct URL and credentials', () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/stream/test-session',
          onMessage,
        })
      );

      expect(global.EventSource).toHaveBeenCalledWith('/api/stream/test-session', {
        withCredentials: true,
      });
    });

    it('should call onOpen when connection opens', async () => {
      const onMessage = vi.fn();
      const onOpen = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/stream/123',
          onMessage,
          onOpen,
        })
      );

      await waitFor(() => {
        expect(mockEventSource).not.toBeNull();
      });

      mockEventSource!.simulateOpen();

      await waitFor(() => {
        expect(onOpen).toHaveBeenCalled();
      });
    });
  });

  describe('message handling', () => {
    it('should parse and forward SSE messages', async () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/stream/123',
          onMessage,
        })
      );

      await waitFor(() => {
        expect(mockEventSource).not.toBeNull();
      });

      mockEventSource!.simulateMessage({
        type: 'test',
        data: 'hello',
      });

      await waitFor(() => {
        expect(onMessage).toHaveBeenCalledWith({
          type: 'test',
          data: 'hello',
        });
      });
    });

    it('should handle multiple messages', async () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/stream/123',
          onMessage,
        })
      );

      await waitFor(() => {
        expect(mockEventSource).not.toBeNull();
      });

      mockEventSource!.simulateMessage({ type: 'message1' });
      mockEventSource!.simulateMessage({ type: 'message2' });
      mockEventSource!.simulateMessage({ type: 'message3' });

      await waitFor(() => {
        expect(onMessage).toHaveBeenCalledTimes(3);
      });

      expect(onMessage).toHaveBeenNthCalledWith(1, { type: 'message1' });
      expect(onMessage).toHaveBeenNthCalledWith(2, { type: 'message2' });
      expect(onMessage).toHaveBeenNthCalledWith(3, { type: 'message3' });
    });

    it('should handle messages with complex data', async () => {
      const onMessage = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/stream/123',
          onMessage,
        })
      );

      await waitFor(() => {
        expect(mockEventSource).not.toBeNull();
      });

      const complexData = {
        type: 'workout',
        plan: {
          date: '2024-01-15',
          exercises: [
            { name: 'Squats', reps: 10, weight: 135 },
            { name: 'Bench Press', reps: 8 },
          ],
        },
      };

      mockEventSource!.simulateMessage(complexData);

      await waitFor(() => {
        expect(onMessage).toHaveBeenCalledWith(complexData);
      });
    });
  });

  describe('error handling', () => {
    it('should call onError on connection error', async () => {
      const onMessage = vi.fn();
      const onError = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/stream/123',
          onMessage,
          onError,
        })
      );

      await waitFor(() => {
        expect(mockEventSource).not.toBeNull();
      });

      mockEventSource!.simulateError();

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    it('should call onError when message parsing fails', async () => {
      const onMessage = vi.fn();
      const onError = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/stream/123',
          onMessage,
          onError,
        })
      );

      await waitFor(() => {
        expect(mockEventSource).not.toBeNull();
      });

      // Simulate invalid JSON
      if (mockEventSource!.onmessage) {
        const event = new MessageEvent('message', {
          data: 'invalid json{{{',
        });
        mockEventSource!.onmessage(event);
      }

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });

      expect(onMessage).not.toHaveBeenCalled();
    });

    it('should close connection on error', async () => {
      const onMessage = vi.fn();
      const onError = vi.fn();

      renderHook(() =>
        useSSE({
          url: '/api/stream/123',
          onMessage,
          onError,
        })
      );

      await waitFor(() => {
        expect(mockEventSource).not.toBeNull();
      });

      const closeSpy = vi.spyOn(mockEventSource!, 'close');

      mockEventSource!.simulateError();

      await waitFor(() => {
        expect(closeSpy).toHaveBeenCalled();
      });
    });
  });

  describe('cleanup', () => {
    it('should close EventSource on unmount', async () => {
      const onMessage = vi.fn();

      const { unmount } = renderHook(() =>
        useSSE({
          url: '/api/stream/123',
          onMessage,
        })
      );

      await waitFor(() => {
        expect(mockEventSource).not.toBeNull();
      });

      const closeSpy = vi.spyOn(mockEventSource!, 'close');

      unmount();

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should close EventSource when URL changes', async () => {
      const onMessage = vi.fn();

      const { rerender } = renderHook(
        ({ url }) =>
          useSSE({
            url,
            onMessage,
          }),
        { initialProps: { url: '/api/stream/123' } }
      );

      await waitFor(() => {
        expect(mockEventSource).not.toBeNull();
      });

      const firstEventSource = mockEventSource;
      const closeSpy = vi.spyOn(firstEventSource!, 'close');

      // Change URL
      rerender({ url: '/api/stream/456' });

      await waitFor(() => {
        expect(closeSpy).toHaveBeenCalled();
      });

      // New EventSource should be created
      expect(global.EventSource).toHaveBeenCalledTimes(2);
    });

    it('should close EventSource when disabled', async () => {
      const onMessage = vi.fn();

      const { rerender } = renderHook(
        ({ enabled }) =>
          useSSE({
            url: '/api/stream/123',
            onMessage,
            enabled,
          }),
        { initialProps: { enabled: true } }
      );

      await waitFor(() => {
        expect(mockEventSource).not.toBeNull();
      });

      const closeSpy = vi.spyOn(mockEventSource!, 'close');

      // Disable connection
      rerender({ enabled: false });

      await waitFor(() => {
        expect(closeSpy).toHaveBeenCalled();
      });
    });
  });

  describe('close function', () => {
    it('should provide a close function', async () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useSSE({
          url: '/api/stream/123',
          onMessage,
        })
      );

      expect(result.current.close).toBeInstanceOf(Function);
    });

    it('should close EventSource when close is called', async () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useSSE({
          url: '/api/stream/123',
          onMessage,
        })
      );

      await waitFor(() => {
        expect(mockEventSource).not.toBeNull();
      });

      const closeSpy = vi.spyOn(mockEventSource!, 'close');

      result.current.close();

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should not throw when closing a null EventSource', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useSSE({
          url: null,
          onMessage,
        })
      );

      // Should not throw
      expect(() => result.current.close()).not.toThrow();
    });
  });

  describe('connection state', () => {
    it('should expose isConnected property', () => {
      const onMessage = vi.fn();

      const { result } = renderHook(() =>
        useSSE({
          url: '/api/stream/123',
          onMessage,
        })
      );

      expect(result.current).toHaveProperty('isConnected');
      expect(typeof result.current.isConnected).toBe('boolean');
    });
  });

  describe('edge cases', () => {
    it('should handle URL changing to null', async () => {
      const onMessage = vi.fn();

      const { rerender } = renderHook(
        ({ url }) =>
          useSSE({
            url,
            onMessage,
          }),
        { initialProps: { url: '/api/stream/123' as string | null } }
      );

      await waitFor(() => {
        expect(mockEventSource).not.toBeNull();
      });

      const closeSpy = vi.spyOn(mockEventSource!, 'close');

      // Change URL to null
      rerender({ url: null });

      await waitFor(() => {
        expect(closeSpy).toHaveBeenCalled();
      });
    });

    it('should handle rapid URL changes', async () => {
      const onMessage = vi.fn();

      const { rerender } = renderHook(
        ({ url }) =>
          useSSE({
            url,
            onMessage,
          }),
        { initialProps: { url: '/api/stream/1' } }
      );

      await waitFor(() => {
        expect(mockEventSource).not.toBeNull();
      });

      // Rapid URL changes
      rerender({ url: '/api/stream/2' });
      rerender({ url: '/api/stream/3' });
      rerender({ url: '/api/stream/4' });

      await waitFor(() => {
        expect(global.EventSource).toHaveBeenCalledTimes(4);
      });
    });

    it('should not throw if EventSource is already closed during cleanup', async () => {
      const onMessage = vi.fn();

      const { unmount } = renderHook(() =>
        useSSE({
          url: '/api/stream/123',
          onMessage,
        })
      );

      await waitFor(() => {
        expect(mockEventSource).not.toBeNull();
      });

      // Manually close EventSource
      mockEventSource!.close();

      // Should not throw
      expect(() => unmount()).not.toThrow();
    });
  });
});
