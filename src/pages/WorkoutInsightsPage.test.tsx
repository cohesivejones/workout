import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import WorkoutInsightsPage from './WorkoutInsightsPage';

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

describe('WorkoutInsightsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEventSource = null;

    // Mock scrollIntoView (not available in jsdom)
    Element.prototype.scrollIntoView = vi.fn();

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

  it('renders the page title and description', () => {
    render(<WorkoutInsightsPage />);

    expect(screen.getByText('Workout Insights')).toBeInTheDocument();
    expect(screen.getByText(/Ask questions about your workout history/i)).toBeInTheDocument();
  });

  it('renders timeframe selector with default value', () => {
    render(<WorkoutInsightsPage />);

    const timeframeSelect = screen.getByLabelText(/data timeframe/i);
    expect(timeframeSelect).toBeInTheDocument();
    expect(timeframeSelect).toHaveValue('30d');
  });

  it('renders all timeframe options', () => {
    render(<WorkoutInsightsPage />);

    const timeframeSelect = screen.getByLabelText(/data timeframe/i);
    const options = Array.from(timeframeSelect.querySelectorAll('option'));

    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent('Last 7 days');
    expect(options[1]).toHaveTextContent('Last 30 days');
    expect(options[2]).toHaveTextContent('Last 3 months');
    expect(options[3]).toHaveTextContent('Last 6 months');
  });

  it('renders question textarea', () => {
    render(<WorkoutInsightsPage />);

    const questionInput = screen.getByLabelText(/your question/i);
    expect(questionInput).toBeInTheDocument();
    expect(questionInput).toHaveAttribute('placeholder');
  });

  it('renders Ask AI button disabled when question is empty', () => {
    render(<WorkoutInsightsPage />);

    const askButton = screen.getByRole('button', { name: /ask ai/i });
    expect(askButton).toBeInTheDocument();
    expect(askButton).toBeDisabled();
  });

  it('enables Ask AI button when question is entered', () => {
    render(<WorkoutInsightsPage />);

    const questionInput = screen.getByLabelText(/your question/i);
    const askButton = screen.getByRole('button', { name: /ask ai/i });

    fireEvent.change(questionInput, { target: { value: 'What is my progress?' } });

    expect(askButton).toBeEnabled();
  });

  it('calls startInsightsSession with question and timeframe when Ask AI is clicked', async () => {
    const mockResponse = {
      sessionId: 'test-session-123',
      dataCount: {
        workouts: 10,
        exercises: 25,
        dateRange: {
          start: '2026-01-27',
          end: '2026-02-26',
        },
      },
    };

    server.use(
      http.post('/api/workout-insights/ask', async ({ request }) => {
        const body = (await request.json()) as { question: string; timeframe: string };
        expect(body.question).toBe('What is my progress?');
        expect(body.timeframe).toBe('7d');
        return HttpResponse.json(mockResponse);
      })
    );

    render(<WorkoutInsightsPage />);

    const questionInput = screen.getByLabelText(/your question/i);
    const timeframeSelect = screen.getByLabelText(/data timeframe/i);
    const askButton = screen.getByRole('button', { name: /ask ai/i });

    // Change timeframe to 7 days
    fireEvent.change(timeframeSelect, { target: { value: '7d' } });

    // Enter question
    fireEvent.change(questionInput, { target: { value: 'What is my progress?' } });

    // Click Ask AI
    fireEvent.click(askButton);

    await waitFor(() => {
      expect(mockEventSource).not.toBeNull();
    });
  });

  it('displays user question in conversation after asking', async () => {
    const mockResponse = {
      sessionId: 'test-session-123',
      dataCount: {
        workouts: 10,
        exercises: 25,
        dateRange: {
          start: '2026-01-27',
          end: '2026-02-26',
        },
      },
    };

    server.use(
      http.post('/api/workout-insights/ask', () => {
        return HttpResponse.json(mockResponse);
      })
    );

    render(<WorkoutInsightsPage />);

    const questionInput = screen.getByLabelText(/your question/i);
    const askButton = screen.getByRole('button', { name: /ask ai/i });

    fireEvent.change(questionInput, { target: { value: 'How often do I work legs?' } });
    fireEvent.click(askButton);

    await waitFor(() => {
      expect(screen.getByText('How often do I work legs?')).toBeInTheDocument();
      expect(screen.getByText('👤 You')).toBeInTheDocument();
    });
  });

  it('displays data summary after starting session', async () => {
    const mockResponse = {
      sessionId: 'test-session-123',
      dataCount: {
        workouts: 12,
        exercises: 30,
        dateRange: {
          start: '2026-01-27',
          end: '2026-02-26',
        },
      },
    };

    server.use(
      http.post('/api/workout-insights/ask', () => {
        return HttpResponse.json(mockResponse);
      })
    );

    render(<WorkoutInsightsPage />);

    const questionInput = screen.getByLabelText(/your question/i);
    const askButton = screen.getByRole('button', { name: /ask ai/i });

    fireEvent.change(questionInput, { target: { value: 'Test question' } });
    fireEvent.click(askButton);

    await waitFor(() => {
      expect(screen.getByText(/Using 12 workouts with 30 exercises/i)).toBeInTheDocument();
    });
  });

  it('shows follow-up input after response is displayed', async () => {
    const mockResponse = {
      sessionId: 'test-session-123',
      dataCount: {
        workouts: 10,
        exercises: 25,
        dateRange: {
          start: '2026-01-27',
          end: '2026-02-26',
        },
      },
    };

    server.use(
      http.post('/api/workout-insights/ask', () => {
        return HttpResponse.json(mockResponse);
      })
    );

    render(<WorkoutInsightsPage />);

    const questionInput = screen.getByLabelText(/your question/i);
    const askButton = screen.getByRole('button', { name: /ask ai/i });

    fireEvent.change(questionInput, { target: { value: 'Test question' } });
    fireEvent.click(askButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/ask a follow-up question/i)).toBeInTheDocument();
    });
  });

  it('can send follow-up questions', async () => {
    const mockInitialResponse = {
      sessionId: 'test-session-123',
      dataCount: {
        workouts: 10,
        exercises: 25,
        dateRange: {
          start: '2026-01-27',
          end: '2026-02-26',
        },
      },
    };

    server.use(
      http.post('/api/workout-insights/ask', async ({ request }) => {
        const body = (await request.json()) as {
          question: string;
          sessionId?: string;
          timeframe?: string;
        };
        if (body.sessionId) {
          // Follow-up question
          expect(body.question).toBe('Tell me more');
          expect(body.sessionId).toBe('test-session-123');
          return HttpResponse.json({ sessionId: 'test-session-123' });
        }
        // Initial question
        return HttpResponse.json(mockInitialResponse);
      })
    );

    render(<WorkoutInsightsPage />);

    // Ask initial question
    const initialInput = screen.getByLabelText(/your question/i);
    fireEvent.change(initialInput, { target: { value: 'Initial question' } });
    fireEvent.click(screen.getByRole('button', { name: /ask ai/i }));

    // Wait for conversation view
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/ask a follow-up question/i)).toBeInTheDocument();
    });

    // Ask follow-up
    const followUpInput = screen.getByPlaceholderText(/ask a follow-up question/i);
    fireEvent.change(followUpInput, { target: { value: 'Tell me more' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('Tell me more')).toBeInTheDocument();
    });
  });

  it('clears conversation when Clear button is clicked', async () => {
    const mockResponse = {
      sessionId: 'test-session-123',
      dataCount: {
        workouts: 10,
        exercises: 25,
        dateRange: {
          start: '2026-01-27',
          end: '2026-02-26',
        },
      },
    };

    server.use(
      http.post('/api/workout-insights/ask', () => {
        return HttpResponse.json(mockResponse);
      })
    );

    render(<WorkoutInsightsPage />);

    // Start a conversation
    const questionInput = screen.getByLabelText(/your question/i);
    fireEvent.change(questionInput, { target: { value: 'Test question' } });
    fireEvent.click(screen.getByRole('button', { name: /ask ai/i }));

    // Wait for conversation view and ensure loading is complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });

    // Simulate SSE completion to exit loading state
    mockEventSource!.simulateMessage({ type: 'complete' });

    // Wait for loading to finish (Clear button enabled when loading is false)
    await waitFor(() => {
      const clearButton = screen.getByRole('button', { name: /clear/i });
      expect(clearButton).toBeEnabled();
    });

    // Click Clear
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    // Should return to initial form
    await waitFor(() => {
      expect(screen.getByLabelText(/data timeframe/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/your question/i)).toBeInTheDocument();
    });
  });

  it('shows chat interface with Send and Clear buttons in conversation view', async () => {
    const mockResponse = {
      sessionId: 'test-session-123',
      dataCount: {
        workouts: 10,
        exercises: 25,
        dateRange: {
          start: '2026-01-27',
          end: '2026-02-26',
        },
      },
    };

    server.use(
      http.post('/api/workout-insights/ask', () => {
        return HttpResponse.json(mockResponse);
      })
    );

    render(<WorkoutInsightsPage />);

    const questionInput = screen.getByLabelText(/your question/i);
    const askButton = screen.getByRole('button', { name: /ask ai/i });

    fireEvent.change(questionInput, { target: { value: 'Test question' } });
    fireEvent.click(askButton);

    // Send and Clear buttons should appear in conversation view
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });

    // Verify we're in conversation view (timeframe selector hidden)
    expect(screen.queryByLabelText(/data timeframe/i)).not.toBeInTheDocument();
  });

  it('displays error message when API call fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.post('/api/workout-insights/ask', () => {
        return HttpResponse.json({ error: 'API Error' }, { status: 500 });
      })
    );

    render(<WorkoutInsightsPage />);

    const questionInput = screen.getByLabelText(/your question/i);
    const askButton = screen.getByRole('button', { name: /ask ai/i });

    fireEvent.change(questionInput, { target: { value: 'Test question' } });
    fireEvent.click(askButton);

    await waitFor(() => {
      expect(screen.getByText(/API Error/i)).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it('shows conversation view after submitting question', async () => {
    const mockResponse = {
      sessionId: 'test-session-123',
      dataCount: {
        workouts: 10,
        exercises: 25,
        dateRange: {
          start: '2026-01-27',
          end: '2026-02-26',
        },
      },
    };

    server.use(
      http.post('/api/workout-insights/ask', () => {
        return HttpResponse.json(mockResponse);
      })
    );

    render(<WorkoutInsightsPage />);

    const questionInput = screen.getByLabelText(/your question/i);
    const askButton = screen.getByRole('button', { name: /ask ai/i });

    fireEvent.change(questionInput, { target: { value: 'Test question' } });
    fireEvent.click(askButton);

    // The initial form timeframe selector should no longer be visible
    await waitFor(() => {
      expect(screen.queryByLabelText(/data timeframe/i)).not.toBeInTheDocument();
    });

    // Conversation should be showing
    expect(screen.getByText('Test question')).toBeInTheDocument();
  });
});
