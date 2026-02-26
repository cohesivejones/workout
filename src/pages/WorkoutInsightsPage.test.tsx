import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorkoutInsightsPage from './WorkoutInsightsPage';
import * as api from '../api';

// Mock the API
vi.mock('../api', () => ({
  startInsightsSession: vi.fn(),
}));

describe('WorkoutInsightsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock EventSource
    global.EventSource = vi.fn().mockImplementation(() => ({
      onmessage: vi.fn(),
      onerror: vi.fn(),
      close: vi.fn(),
    })) as unknown as typeof EventSource;
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

    vi.mocked(api.startInsightsSession).mockResolvedValue(mockResponse);

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
      expect(api.startInsightsSession).toHaveBeenCalledWith('What is my progress?', '7d');
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

    vi.mocked(api.startInsightsSession).mockResolvedValue(mockResponse);

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

    vi.mocked(api.startInsightsSession).mockResolvedValue(mockResponse);

    render(<WorkoutInsightsPage />);

    const questionInput = screen.getByLabelText(/your question/i);
    const askButton = screen.getByRole('button', { name: /ask ai/i });

    fireEvent.change(questionInput, { target: { value: 'Test question' } });
    fireEvent.click(askButton);

    await waitFor(() => {
      expect(screen.getByText(/Using 12 workouts with 30 exercises/i)).toBeInTheDocument();
    });
  });

  it('shows Ask Another Question button after response is displayed', async () => {
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

    vi.mocked(api.startInsightsSession).mockResolvedValue(mockResponse);

    render(<WorkoutInsightsPage />);

    const questionInput = screen.getByLabelText(/your question/i);
    const askButton = screen.getByRole('button', { name: /ask ai/i });

    fireEvent.change(questionInput, { target: { value: 'Test question' } });
    fireEvent.click(askButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ask another question/i })).toBeInTheDocument();
    });
  });

  it('shows reset button in conversation view', async () => {
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

    vi.mocked(api.startInsightsSession).mockResolvedValue(mockResponse);

    render(<WorkoutInsightsPage />);

    const questionInput = screen.getByLabelText(/your question/i);
    const askButton = screen.getByRole('button', { name: /ask ai/i });

    fireEvent.change(questionInput, { target: { value: 'Test question' } });
    fireEvent.click(askButton);

    // Reset button should appear in conversation view
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ask another question/i })).toBeInTheDocument();
    });

    // Verify we're in conversation view (input form hidden)
    expect(screen.queryByLabelText(/your question/i)).not.toBeInTheDocument();
  });

  it('displays error message when API call fails', async () => {
    vi.mocked(api.startInsightsSession).mockRejectedValue(new Error('API Error'));

    render(<WorkoutInsightsPage />);

    const questionInput = screen.getByLabelText(/your question/i);
    const askButton = screen.getByRole('button', { name: /ask ai/i });

    fireEvent.change(questionInput, { target: { value: 'Test question' } });
    fireEvent.click(askButton);

    await waitFor(() => {
      expect(screen.getByText(/API Error/i)).toBeInTheDocument();
    });
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

    vi.mocked(api.startInsightsSession).mockResolvedValue(mockResponse);

    render(<WorkoutInsightsPage />);

    const questionInput = screen.getByLabelText(/your question/i);
    const askButton = screen.getByRole('button', { name: /ask ai/i });

    fireEvent.change(questionInput, { target: { value: 'Test question' } });
    fireEvent.click(askButton);

    // The input form should no longer be visible
    await waitFor(() => {
      expect(screen.queryByLabelText(/your question/i)).not.toBeInTheDocument();
    });

    // Conversation should be showing
    expect(screen.getByText('Test question')).toBeInTheDocument();
  });
});
