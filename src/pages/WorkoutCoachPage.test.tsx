import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import WorkoutCoachPage from './WorkoutCoachPage';

// Mock EventSource
class MockEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState: number = 0;
  url: string;

  constructor(url: string) {
    this.url = url;
    this.readyState = 1; // OPEN

    // Simulate connected event
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(
          new MessageEvent('message', {
            data: JSON.stringify({ type: 'connected' }),
          })
        );
      }
    }, 10);
  }

  close() {
    this.readyState = 2; // CLOSED
  }

  // Helper to simulate receiving a message
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage(
        new MessageEvent('message', {
          data: JSON.stringify(data),
        })
      );
    }
  }

  // Helper to simulate an error
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

let mockEventSource: MockEventSource | null = null;

describe('WorkoutCoachPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEventSource = null;

    // Mock EventSource globally
    global.EventSource = vi.fn((url: string) => {
      mockEventSource = new MockEventSource(url);
      return mockEventSource as unknown as EventSource;
    }) as unknown as typeof EventSource;
  });

  afterEach(() => {
    if (mockEventSource) {
      mockEventSource.close();
    }
  });

  it('renders the initial page with start button', () => {
    render(<WorkoutCoachPage />);

    expect(screen.getByText('Workout Coach')).toBeInTheDocument();
    expect(
      screen.getByText(/Your personal AI workout coach will generate a customized workout/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Conversation' })).toBeInTheDocument();
  });

  it('starts a session and connects to SSE stream', async () => {
    const mockResponse = {
      sessionId: 'test-session-123',
      message: 'Session created',
    };

    server.use(
      http.post('/api/workout-coach/start', () => {
        return HttpResponse.json(mockResponse);
      })
    );

    render(<WorkoutCoachPage />);

    const startButton = screen.getByRole('button', { name: 'Start Conversation' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getAllByText('🤖 Coach').length).toBeGreaterThan(0);
      expect(screen.getByText('Generating your workout...')).toBeInTheDocument();
    });

    // Verify EventSource was created with correct URL
    expect(global.EventSource).toHaveBeenCalledWith('/api/workout-coach/stream/test-session-123', {
      withCredentials: true,
    });
  });

  it('displays workout when received via SSE', async () => {
    const mockResponse = {
      sessionId: 'test-session-123',
      message: 'Session created',
    };

    const mockWorkoutPlan = {
      date: '2025-12-06',
      exercises: [
        { name: 'Squats', reps: 10, weight: 135 },
        { name: 'Push-ups', reps: 15 },
        { name: 'Plank', reps: 30 },
      ],
    };

    server.use(
      http.post('/api/workout-coach/start', () => {
        return HttpResponse.json(mockResponse);
      })
    );

    render(<WorkoutCoachPage />);

    const startButton = screen.getByRole('button', { name: 'Start Conversation' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockEventSource).not.toBeNull();
    });

    // Simulate workout SSE event
    mockEventSource!.simulateMessage({
      type: 'workout',
      plan: mockWorkoutPlan,
    });

    await waitFor(() => {
      expect(screen.getByText(/Here's your workout for today:/)).toBeInTheDocument();
      expect(screen.getByText(/Squats - 10 reps @ 135 lbs/)).toBeInTheDocument();
      expect(screen.getByText(/Push-ups - 15 reps/)).toBeInTheDocument();
      expect(screen.getByText(/Ready to do this workout?/)).toBeInTheDocument();
    });

    // Should show Yes/No buttons
    expect(screen.getByRole('button', { name: "Yes, let's do it!" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No, generate another' })).toBeInTheDocument();
  });

  it('handles user accepting workout', async () => {
    const mockResponse = {
      sessionId: 'test-session-123',
      message: 'Session created',
    };

    const mockWorkoutPlan = {
      date: '2025-12-06',
      exercises: [{ name: 'Squats', reps: 10, weight: 135 }],
    };

    server.use(
      http.post('/api/workout-coach/start', () => {
        return HttpResponse.json(mockResponse);
      }),
      http.post('/api/workout-coach/respond', async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ sessionId: 'test-session-123', response: 'yes' });
        return HttpResponse.json({ message: 'Response recorded' });
      })
    );

    render(<WorkoutCoachPage />);

    const startButton = screen.getByRole('button', { name: 'Start Conversation' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockEventSource).not.toBeNull();
    });

    // Simulate workout received
    mockEventSource!.simulateMessage({
      type: 'workout',
      plan: mockWorkoutPlan,
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: "Yes, let's do it!" })).toBeInTheDocument();
    });

    // Click Yes
    const yesButton = screen.getByRole('button', { name: "Yes, let's do it!" });
    fireEvent.click(yesButton);

    await waitFor(() => {
      expect(screen.getByText('Yes!')).toBeInTheDocument();
    });

    // Simulate saved event from SSE
    mockEventSource!.simulateMessage({
      type: 'saved',
      workoutId: 123,
    });

    await waitFor(() => {
      expect(
        screen.getByText("Great! Your workout has been saved. Let's crush it! 💪")
      ).toBeInTheDocument();
    });

    // Should show restart button
    expect(screen.getByRole('button', { name: 'Start New Conversation' })).toBeInTheDocument();
  });

  it('handles user rejecting workout for regeneration', async () => {
    const mockResponse = {
      sessionId: 'test-session-123',
      message: 'Session created',
    };

    const mockWorkoutPlan1 = {
      date: '2025-12-06',
      exercises: [{ name: 'Squats', reps: 10 }],
    };

    const mockWorkoutPlan2 = {
      date: '2025-12-06',
      exercises: [{ name: 'Deadlifts', reps: 8 }],
    };

    server.use(
      http.post('/api/workout-coach/start', () => {
        return HttpResponse.json(mockResponse);
      }),
      http.post('/api/workout-coach/respond', async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ sessionId: 'test-session-123', response: 'no' });
        return HttpResponse.json({ message: 'Response recorded' });
      })
    );

    render(<WorkoutCoachPage />);

    const startButton = screen.getByRole('button', { name: 'Start Conversation' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockEventSource).not.toBeNull();
    });

    // Simulate first workout
    mockEventSource!.simulateMessage({
      type: 'workout',
      plan: mockWorkoutPlan1,
    });

    await waitFor(() => {
      expect(screen.getByText(/Squats/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: "Yes, let's do it!" })).toBeInTheDocument();
    });

    // Click No
    const noButton = screen.getByRole('button', { name: 'No, generate another' });
    fireEvent.click(noButton);

    await waitFor(() => {
      expect(screen.getByText('No, generate another')).toBeInTheDocument();
    });

    // Simulate generating message
    mockEventSource!.simulateMessage({
      type: 'generating',
    });

    // Simulate new workout
    mockEventSource!.simulateMessage({
      type: 'workout',
      plan: mockWorkoutPlan2,
    });

    await waitFor(() => {
      expect(screen.getByText(/Deadlifts/)).toBeInTheDocument();
      expect(screen.getByText('Ready to do this workout?')).toBeInTheDocument();
      // Buttons should be visible again for the new workout
      expect(screen.getByRole('button', { name: "Yes, let's do it!" })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'No, generate another' })).toBeInTheDocument();
    });
  });

  it('displays error message on start session failure', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const errorMessage = 'Failed to start coach session';

    server.use(
      http.post('/api/workout-coach/start', () => {
        return HttpResponse.json({ error: errorMessage }, { status: 500 });
      })
    );

    render(<WorkoutCoachPage />);

    const startButton = screen.getByRole('button', { name: 'Start Conversation' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it('displays error message from SSE', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockResponse = {
      sessionId: 'test-session-123',
      message: 'Session created',
    };

    server.use(
      http.post('/api/workout-coach/start', () => {
        return HttpResponse.json(mockResponse);
      })
    );

    render(<WorkoutCoachPage />);

    const startButton = screen.getByRole('button', { name: 'Start Conversation' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockEventSource).not.toBeNull();
    });

    // Simulate error event
    mockEventSource!.simulateMessage({
      type: 'error',
      message: 'Failed to generate workout',
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to generate workout')).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it('handles SSE connection error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockResponse = {
      sessionId: 'test-session-123',
      message: 'Session created',
    };

    server.use(
      http.post('/api/workout-coach/start', () => {
        return HttpResponse.json(mockResponse);
      })
    );

    render(<WorkoutCoachPage />);

    const startButton = screen.getByRole('button', { name: 'Start Conversation' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockEventSource).not.toBeNull();
    });

    // Simulate connection error
    mockEventSource!.simulateError();

    await waitFor(() => {
      expect(screen.getByText('Connection error. Please try again.')).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it('resets conversation when Start New Conversation is clicked', async () => {
    const mockResponse = {
      sessionId: 'test-session-123',
      message: 'Session created',
    };

    const mockWorkoutPlan = {
      date: '2025-12-06',
      exercises: [{ name: 'Squats', reps: 10 }],
    };

    server.use(
      http.post('/api/workout-coach/start', () => {
        return HttpResponse.json(mockResponse);
      }),
      http.post('/api/workout-coach/respond', () => {
        return HttpResponse.json({ message: 'Response recorded' });
      })
    );

    render(<WorkoutCoachPage />);

    // Start and complete a session
    const startButton = screen.getByRole('button', { name: 'Start Conversation' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockEventSource).not.toBeNull();
    });

    mockEventSource!.simulateMessage({
      type: 'workout',
      plan: mockWorkoutPlan,
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: "Yes, let's do it!" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: "Yes, let's do it!" }));

    await waitFor(() => {
      expect(screen.getByText('Yes!')).toBeInTheDocument();
    });

    mockEventSource!.simulateMessage({
      type: 'saved',
      workoutId: 123,
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start New Conversation' })).toBeInTheDocument();
    });

    // Click restart
    const restartButton = screen.getByRole('button', { name: 'Start New Conversation' });
    fireEvent.click(restartButton);

    // Should be back to initial state
    expect(screen.getByRole('button', { name: 'Start Conversation' })).toBeInTheDocument();
    expect(screen.queryByText(/Squats/)).not.toBeInTheDocument();
  });

  it('cleans up EventSource on unmount', async () => {
    const mockResponse = {
      sessionId: 'test-session-123',
      message: 'Session created',
    };

    server.use(
      http.post('/api/workout-coach/start', () => {
        return HttpResponse.json(mockResponse);
      })
    );

    const { unmount } = render(<WorkoutCoachPage />);

    const startButton = screen.getByRole('button', { name: 'Start Conversation' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockEventSource).not.toBeNull();
    });

    const closeSpy = vi.spyOn(mockEventSource!, 'close');

    unmount();

    expect(closeSpy).toHaveBeenCalled();
  });
});
