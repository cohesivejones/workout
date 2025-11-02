import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import GenerateWorkoutPage from './GenerateWorkoutPage';

describe('GenerateWorkoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with all required elements', () => {
    render(<GenerateWorkoutPage />);

    expect(screen.getByText('Generate a Workout')).toBeInTheDocument();
    expect(screen.getByLabelText('Additional Notes (Optional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Add any specific requests/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Workout' })).toBeInTheDocument();
    expect(screen.getByText(/Tell the AI about any specific goals/)).toBeInTheDocument();
  });

  it('allows user to enter additional notes', () => {
    render(<GenerateWorkoutPage />);

    const textarea = screen.getByLabelText('Additional Notes (Optional)');
    fireEvent.change(textarea, { target: { value: 'Focus on upper body today' } });

    expect(textarea).toHaveValue('Focus on upper body today');
  });

  it('submits form with additional notes', async () => {
    const mockResponse = {
      generatedWorkout:
        '1. Push-ups: 3 sets of 12\n2. Squats: 3 sets of 15\n3. Plank: 3 sets of 30 seconds',
    };

    server.use(
      http.post('/api/workouts/generate', async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ additionalNotes: 'Focus on upper body' });
        return HttpResponse.json(mockResponse);
      })
    );

    render(<GenerateWorkoutPage />);

    const textarea = screen.getByLabelText('Additional Notes (Optional)');
    const submitButton = screen.getByRole('button', { name: 'Generate Workout' });

    fireEvent.change(textarea, { target: { value: 'Focus on upper body' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Your Generated Workout')).toBeInTheDocument();
    });
  });

  it('submits form without additional notes', async () => {
    const mockResponse = {
      generatedWorkout: '1. Push-ups: 3 sets of 12\n2. Squats: 3 sets of 15',
    };

    server.use(
      http.post('/api/workouts/generate', async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ additionalNotes: undefined });
        return HttpResponse.json(mockResponse);
      })
    );

    render(<GenerateWorkoutPage />);

    const submitButton = screen.getByRole('button', { name: 'Generate Workout' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Your Generated Workout')).toBeInTheDocument();
    });
  });

  it('shows loading state during API call', async () => {
    server.use(
      http.post('/api/workouts/generate', () => {
        return new Promise((resolve) => setTimeout(resolve, 100));
      })
    );

    render(<GenerateWorkoutPage />);

    const submitButton = screen.getByRole('button', { name: 'Generate Workout' });
    fireEvent.click(submitButton);

    expect(screen.getByText('Generating...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    expect(screen.getByLabelText('Additional Notes (Optional)')).toBeDisabled();
  });

  it('displays generated workout after successful API call', async () => {
    const mockResponse = {
      generatedWorkout:
        '1. Push-ups: 3 sets of 12\n2. Squats: 3 sets of 15\n3. Plank: 3 sets of 30 seconds',
    };

    server.use(
      http.post('/api/workouts/generate', () => {
        return HttpResponse.json(mockResponse);
      })
    );

    render(<GenerateWorkoutPage />);

    const submitButton = screen.getByRole('button', { name: 'Generate Workout' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Your Generated Workout')).toBeInTheDocument();
      expect(screen.getByText(/Push-ups: 3 sets of 12/)).toBeInTheDocument();
      expect(screen.getByText(/Squats: 3 sets of 15/)).toBeInTheDocument();
      expect(screen.getByText(/Plank: 3 sets of 30 seconds/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Generate Another Workout' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Over' })).toBeInTheDocument();
  });

  it('displays error message on API failure', async () => {
    const errorMessage = 'Failed to generate workout';

    server.use(
      http.post('/api/workouts/generate', () => {
        return HttpResponse.json({ error: errorMessage }, { status: 500 });
      })
    );

    render(<GenerateWorkoutPage />);

    const submitButton = screen.getByRole('button', { name: 'Generate Workout' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Start Over' })).toBeInTheDocument();
  });

  it('resets form when Start Over button is clicked', async () => {
    const mockResponse = {
      generatedWorkout: '1. Push-ups: 3 sets of 12',
    };

    server.use(
      http.post('/api/workouts/generate', () => {
        return HttpResponse.json(mockResponse);
      })
    );

    render(<GenerateWorkoutPage />);

    const textarea = screen.getByLabelText('Additional Notes (Optional)');
    const submitButton = screen.getByRole('button', { name: 'Generate Workout' });

    // Fill form and submit
    fireEvent.change(textarea, { target: { value: 'Test notes' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Your Generated Workout')).toBeInTheDocument();
    });

    // Click Start Over
    const startOverButton = screen.getByRole('button', { name: 'Start Over' });
    fireEvent.click(startOverButton);

    // Check form is reset
    expect(textarea).toHaveValue('');
    expect(screen.queryByText('Your Generated Workout')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Workout' })).toBeInTheDocument();
  });

  it('resets form when Generate Another Workout button is clicked', async () => {
    const mockResponse = {
      generatedWorkout: '1. Push-ups: 3 sets of 12',
    };

    server.use(
      http.post('/api/workouts/generate', () => {
        return HttpResponse.json(mockResponse);
      })
    );

    render(<GenerateWorkoutPage />);

    const textarea = screen.getByLabelText('Additional Notes (Optional)');
    const submitButton = screen.getByRole('button', { name: 'Generate Workout' });

    // Fill form and submit
    fireEvent.change(textarea, { target: { value: 'Test notes' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Your Generated Workout')).toBeInTheDocument();
    });

    // Click Generate Another Workout
    const generateAnotherButton = screen.getByRole('button', { name: 'Generate Another Workout' });
    fireEvent.click(generateAnotherButton);

    // Check form is reset
    expect(textarea).toHaveValue('');
    expect(screen.queryByText('Your Generated Workout')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Workout' })).toBeInTheDocument();
  });

  it('trims whitespace from additional notes', async () => {
    const mockResponse = {
      generatedWorkout: '1. Push-ups: 3 sets of 12',
    };

    server.use(
      http.post('/api/workouts/generate', async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ additionalNotes: 'Focus on upper body' });
        return HttpResponse.json(mockResponse);
      })
    );

    render(<GenerateWorkoutPage />);

    const textarea = screen.getByLabelText('Additional Notes (Optional)');
    const submitButton = screen.getByRole('button', { name: 'Generate Workout' });

    fireEvent.change(textarea, { target: { value: '  Focus on upper body  ' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Your Generated Workout')).toBeInTheDocument();
    });
  });

  it('sends undefined for empty additional notes', async () => {
    const mockResponse = {
      generatedWorkout: '1. Push-ups: 3 sets of 12',
    };

    server.use(
      http.post('/api/workouts/generate', async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ additionalNotes: undefined });
        return HttpResponse.json(mockResponse);
      })
    );

    render(<GenerateWorkoutPage />);

    const textarea = screen.getByLabelText('Additional Notes (Optional)');
    const submitButton = screen.getByRole('button', { name: 'Generate Workout' });

    fireEvent.change(textarea, { target: { value: '   ' } }); // Only whitespace
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Your Generated Workout')).toBeInTheDocument();
    });
  });
});
