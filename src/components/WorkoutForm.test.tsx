import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import WorkoutForm from './WorkoutForm';
import { Workout, WorkoutFormProps } from '../types';
import * as UserContext from '../contexts/useUserContext';

interface SelectOption {
  label: string;
  value: string;
}

interface MockSelectProps {
  options: SelectOption[];
  value: SelectOption | null;
  onChange: (option: SelectOption | null) => void;
}

vi.mock('react-select/creatable', () => ({
  default: ({ options, value, onChange }: MockSelectProps) => {
    function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
      const option = options.find(
        (option: SelectOption) => option.value === event.currentTarget.value
      );
      onChange(option || null);
    }

    return (
      <select
        data-testid="exercise-select"
        value={value ? value.value : ''}
        onChange={handleChange}
      >
        <option value="">Select...</option>
        {options.map(({ label, value }: SelectOption) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    );
  },
}));

describe('WorkoutForm', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(true);
  const mockOnSaveExercise = vi.fn().mockResolvedValue(true);
  const mockSavedExercises = [
    { id: 1, userId: 1, name: 'Push-ups' },
    { id: 2, userId: 1, name: 'Squats' },
    { id: 3, userId: 1, name: 'Lunges' },
  ];

  const defaultProps: WorkoutFormProps = {
    onSubmit: mockOnSubmit,
    onSaveExercise: mockOnSaveExercise,
    savedExercises: mockSavedExercises,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Suppress expected console.error for API errors in these tests
    vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.spyOn(UserContext, 'useUserContext').mockReturnValue({
      user: { id: 1, name: 'Bob Jones', email: 'bob@example.com' },
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    });

    // Mock the fetchRecentExerciseData API to reject by default
    server.use(
      http.get('/api/exercises/recent', () => {
        return HttpResponse.json({ error: 'Failed to fetch recent data' }, { status: 500 });
      })
    );
  });

  it('renders the form with correct initial state for new workout', () => {
    render(<WorkoutForm {...defaultProps} />);

    // Check title
    expect(screen.getByText('New Workout')).toBeInTheDocument();

    // Check date input
    expect(screen.getByLabelText(/workout date/i)).toBeInTheDocument();

    // Check instructor checkbox
    expect(screen.getByLabelText(/with instructor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/with instructor/i)).not.toBeChecked();

    // Check exercise select
    expect(screen.getByTestId('exercise-select')).toBeInTheDocument();

    // Check reps and weight inputs
    expect(screen.getByPlaceholderText('Reps')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Weight (lbs)')).toBeInTheDocument();

    // Check unit toggle buttons
    expect(screen.getByRole('button', { name: 'lbs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'kgs' })).toBeInTheDocument();

    // Check add exercise button
    expect(screen.getByText('Add Exercise')).toBeInTheDocument();
    expect(screen.getByText('Add Exercise')).toBeDisabled();

    // Check save workout button
    expect(screen.getByText('Save Workout')).toBeInTheDocument();
    expect(screen.getByText('Save Workout')).toBeDisabled();

    // Check no exercises message
    expect(screen.getByText(/No exercises added yet/i)).toBeInTheDocument();
  });

  it('renders the form with correct initial state for existing workout', () => {
    const existingWorkout: Workout = {
      id: 1,
      userId: 1,
      date: '2025-03-01',
      withInstructor: true,
      exercises: [
        { id: 1, name: 'Push-ups', reps: 10 },
        { id: 2, name: 'Squats', reps: 15, weight: 20 },
      ],
    };

    render(<WorkoutForm {...defaultProps} existingWorkout={existingWorkout} />);

    // Check title
    expect(screen.getByText('Edit Workout')).toBeInTheDocument();

    // Check date input
    expect(screen.getByLabelText(/workout date/i)).toHaveValue('2025-03-01');

    // Check instructor checkbox
    expect(screen.getByLabelText(/with instructor/i)).toBeChecked();

    // Check exercises are displayed (now as links since they have IDs)
    expect(screen.getByRole('link', { name: 'Push-ups' })).toBeInTheDocument();
    expect(screen.getByText('10 reps')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Squats' })).toBeInTheDocument();
    expect(screen.getByText('15 reps')).toBeInTheDocument();
    expect(screen.getByText('20 lbs (9.1 kg)')).toBeInTheDocument();

    // Check save workout button
    expect(screen.getByText('Update Workout')).toBeInTheDocument();
    expect(screen.getByText('Update Workout')).toBeEnabled();
  });

  it('allows adding an exercise', async () => {
    render(<WorkoutForm {...defaultProps} />);

    // Select an exercise
    const exerciseSelect = screen.getByTestId('exercise-select');
    fireEvent.change(exerciseSelect, { target: { value: 'Push-ups' } });

    // Enter reps
    const repsInput = screen.getByPlaceholderText('Reps');
    fireEvent.change(repsInput, { target: { value: '12' } });

    // Enter weight
    const weightInput = screen.getByPlaceholderText('Weight (lbs)');
    fireEvent.change(weightInput, { target: { value: '0' } });

    // Click add exercise button
    const addButton = screen.getByText('Add Exercise');
    expect(addButton).toBeEnabled();
    fireEvent.click(addButton);

    // Wait for the exercise to be added - use test ID to target the added exercise specifically
    await waitFor(() => {
      expect(mockOnSaveExercise).toHaveBeenCalledWith('Push-ups');
    });

    const addedExercise = await screen.findByTestId('added-exercise-push-ups');
    expect(addedExercise).toBeInTheDocument();
    expect(addedExercise).toHaveTextContent('Push-ups');
    expect(addedExercise).toHaveTextContent('12 reps');

    // Check that the form is reset
    expect(repsInput).toHaveValue(null);
    expect(weightInput).toHaveValue(null);

    // Check that the save button is now enabled
    expect(screen.getByText('Save Workout')).toBeEnabled();
  });

  it('allows removing an exercise', async () => {
    const existingWorkout: Workout = {
      id: 1,
      userId: 1,
      date: '2025-03-01',
      withInstructor: false,
      exercises: [
        { id: 1, name: 'Push-ups', reps: 10 },
        { id: 2, name: 'Squats', reps: 15 },
      ],
    };

    render(<WorkoutForm {...defaultProps} existingWorkout={existingWorkout} />);

    // Check that both exercises are displayed (now as links since they have IDs)
    expect(screen.getByRole('link', { name: 'Push-ups' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Squats' })).toBeInTheDocument();

    // Get the remove buttons
    const removeButtons = screen.getAllByTitle('Remove exercise');
    expect(removeButtons).toHaveLength(2);

    // Click the first remove button
    fireEvent.click(removeButtons[0]);

    // Check that the first exercise is removed
    expect(screen.queryByRole('link', { name: 'Push-ups' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Squats' })).toBeInTheDocument();
  });

  it('submits the form with correct data', async () => {
    // Use the same date format logic as WorkoutForm
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    render(<WorkoutForm {...defaultProps} />);

    // Toggle instructor checkbox
    const instructorCheckbox = screen.getByLabelText(/with instructor/i);
    fireEvent.click(instructorCheckbox);
    expect(instructorCheckbox).toBeChecked();

    // Add an exercise
    const exerciseSelect = screen.getByTestId('exercise-select');
    fireEvent.change(exerciseSelect, { target: { value: 'Squats' } });

    const repsInput = screen.getByPlaceholderText('Reps');
    fireEvent.change(repsInput, { target: { value: '15' } });

    const weightInput = screen.getByPlaceholderText('Weight (lbs)');
    fireEvent.change(weightInput, { target: { value: '20' } });

    const addButton = screen.getByText('Add Exercise');
    fireEvent.click(addButton);

    const addedExercise = await screen.findByTestId('added-exercise-squats');
    expect(addedExercise).toBeInTheDocument();
    expect(addedExercise).toHaveTextContent('Squats');
    expect(addedExercise).toHaveTextContent('15 reps');
    expect(addedExercise).toHaveTextContent('20 lbs (9.1 kg)');

    // Submit the form
    const submitButton = screen.getByText('Save Workout');
    fireEvent.click(submitButton);

    // Check that onSubmit was called with the correct data
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        date: today,
        withInstructor: true,
        exercises: [
          {
            name: 'Squats',
            reps: 15,
            weight: 20,
            timeSeconds: null,
          },
        ],
      });
    });
  });

  it('displays error message when form submission fails', async () => {
    // Override the mock to simulate an error
    const mockOnSubmitError = vi.fn().mockRejectedValue(new Error('Failed to save workout'));

    const existingWorkout: Workout = {
      id: 1,
      userId: 1,
      date: '2025-03-01',
      withInstructor: false,
      exercises: [{ id: 1, name: 'Push-ups', reps: 10 }],
    };

    render(
      <WorkoutForm
        {...defaultProps}
        onSubmit={mockOnSubmitError}
        existingWorkout={existingWorkout}
      />
    );

    // Submit the form
    const submitButton = screen.getByText('Update Workout');
    fireEvent.click(submitButton);

    expect(await screen.findByText('Failed to save workout')).toBeInTheDocument();
  });

  it('displays error message when add exercise fails', async () => {
    // Override the mock to simulate an error
    const mockOnSaveExercise = vi.fn().mockRejectedValue(new Error('Failed to save exercise'));

    const existingWorkout: Workout = {
      id: 1,
      userId: 1,
      date: '2025-03-01',
      withInstructor: false,
      exercises: [{ id: 1, name: 'Push-ups', reps: 10 }],
    };

    render(
      <WorkoutForm
        {...defaultProps}
        onSaveExercise={mockOnSaveExercise}
        existingWorkout={existingWorkout}
      />
    );

    // Add an exercise
    const exerciseSelect = screen.getByTestId('exercise-select');
    fireEvent.change(exerciseSelect, { target: { value: 'Squats' } });

    const repsInput = screen.getByPlaceholderText('Reps');
    fireEvent.change(repsInput, { target: { value: '15' } });

    const weightInput = screen.getByPlaceholderText('Weight (lbs)');
    fireEvent.change(weightInput, { target: { value: '20' } });

    const addButton = screen.getByText('Add Exercise');
    fireEvent.click(addButton);

    expect(await screen.findByText('Failed to save exercise')).toBeInTheDocument();
  });

  it('renders exercise progression links for persisted exercises', () => {
    const existingWorkout: Workout = {
      id: 1,
      userId: 1,
      date: '2025-03-01',
      withInstructor: false,
      exercises: [
        { id: 1, name: 'Push-ups', reps: 10 },
        { id: 2, name: 'Squats', reps: 15, weight: 20 },
      ],
    };

    render(<WorkoutForm {...defaultProps} existingWorkout={existingWorkout} />);

    // Check that exercises with IDs are rendered as links
    const pushUpsLink = screen.getByRole('link', { name: 'Push-ups' });
    expect(pushUpsLink).toBeInTheDocument();
    expect(pushUpsLink).toHaveAttribute('href', '/exercises/1/progression');

    const squatsLink = screen.getByRole('link', { name: 'Squats' });
    expect(squatsLink).toBeInTheDocument();
    expect(squatsLink).toHaveAttribute('href', '/exercises/2/progression');
  });

  it('does not render exercise progression links for new exercises without IDs', async () => {
    render(<WorkoutForm {...defaultProps} />);

    // Add a new exercise (which won't have an ID)
    const exerciseSelect = screen.getByTestId('exercise-select');
    fireEvent.change(exerciseSelect, { target: { value: 'Push-ups' } });

    const repsInput = screen.getByPlaceholderText('Reps');
    fireEvent.change(repsInput, { target: { value: '12' } });

    const addButton = screen.getByText('Add Exercise');
    fireEvent.click(addButton);

    // Wait for the exercise to be added
    await waitFor(() => {
      const exerciseList = screen.getByTestId('exercise-list');
      expect(exerciseList).toHaveTextContent('Push-ups');
      expect(exerciseList).toHaveTextContent('12 reps');
    });

    // Check that the exercise name is not a link
    const pushUpsLink = screen.queryByRole('link', { name: 'Push-ups' });
    expect(pushUpsLink).not.toBeInTheDocument();

    // Verify the text is present in the exercise list (not in the dropdown)
    const exerciseList = screen.getByTestId('exercise-list');
    expect(exerciseList).toHaveTextContent('Push-ups');
  });

  describe('weight unit toggle', () => {
    it('defaults to lb unit', () => {
      render(<WorkoutForm {...defaultProps} />);

      expect(screen.getByPlaceholderText('Weight (lbs)')).toBeInTheDocument();
    });

    it('switches to kgs unit when kgs button is clicked', async () => {
      render(<WorkoutForm {...defaultProps} />);

      const kgsButton = screen.getByRole('button', { name: 'kgs' });
      fireEvent.click(kgsButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Weight (kgs)')).toBeInTheDocument();
      });
    });

    it('converts weight value when switching from lbs to kgs', async () => {
      render(<WorkoutForm {...defaultProps} />);

      const weightInput = screen.getByPlaceholderText('Weight (lbs)');
      fireEvent.change(weightInput, { target: { value: '100' } });

      const kgsButton = screen.getByRole('button', { name: 'kgs' });
      fireEvent.click(kgsButton);

      await waitFor(() => {
        expect(weightInput).toHaveValue(45.4); // 100 lbs = 45.4 kg
      });
    });

    it('converts weight value when switching from kgs to lbs', async () => {
      render(<WorkoutForm {...defaultProps} />);

      // Switch to kgs first
      const kgsButton = screen.getByRole('button', { name: 'kgs' });
      fireEvent.click(kgsButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Weight (kgs)')).toBeInTheDocument();
      });

      const weightInput = screen.getByPlaceholderText('Weight (kgs)');
      fireEvent.change(weightInput, { target: { value: '45.4' } });

      const lbsButton = screen.getByRole('button', { name: 'lbs' });
      fireEvent.click(lbsButton);

      await waitFor(() => {
        expect(weightInput).toHaveValue(100.1); // 45.4 kg ≈ 100.1 lbs
      });
    });

    it('stores weight in lbs when input is in kgs', async () => {
      render(<WorkoutForm {...defaultProps} />);

      // Switch to kgs
      const kgsButton = screen.getByRole('button', { name: 'kgs' });
      fireEvent.click(kgsButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Weight (kgs)')).toBeInTheDocument();
      });

      // Add an exercise with kg weight
      const exerciseSelect = screen.getByTestId('exercise-select');
      fireEvent.change(exerciseSelect, { target: { value: 'Squats' } });

      const repsInput = screen.getByPlaceholderText('Reps');
      fireEvent.change(repsInput, { target: { value: '10' } });

      const weightInput = screen.getByPlaceholderText('Weight (kgs)');
      fireEvent.change(weightInput, { target: { value: '45.4' } });

      const addButton = screen.getByText('Add Exercise');
      fireEvent.click(addButton);

      // Exercise should be stored and displayed in lbs with kg conversion
      const addedExercise = await screen.findByTestId('added-exercise-squats');
      expect(addedExercise).toBeInTheDocument();
      expect(addedExercise).toHaveTextContent('Squats');
      expect(addedExercise).toHaveTextContent('10 reps');
      expect(addedExercise).toHaveTextContent('100.1 lbs (45.4 kg)');
    });

    it('shows conversion suffix when weight is entered in lbs', async () => {
      render(<WorkoutForm {...defaultProps} />);

      const weightInput = screen.getByPlaceholderText('Weight (lbs)');
      fireEvent.change(weightInput, { target: { value: '100' } });

      await waitFor(() => {
        expect(screen.getByText('45.4 kgs')).toBeInTheDocument();
      });
    });

    it('shows conversion suffix when weight is entered in kgs', async () => {
      render(<WorkoutForm {...defaultProps} />);

      // Switch to kgs
      const kgsButton = screen.getByRole('button', { name: 'kgs' });
      fireEvent.click(kgsButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Weight (kgs)')).toBeInTheDocument();
      });

      const weightInput = screen.getByPlaceholderText('Weight (kgs)');
      fireEvent.change(weightInput, { target: { value: '45.4' } });

      await waitFor(() => {
        expect(screen.getByText('100.1 lbs')).toBeInTheDocument();
      });
    });

    it('does not convert empty weight when switching units', async () => {
      render(<WorkoutForm {...defaultProps} />);

      const kgsButton = screen.getByRole('button', { name: 'kgs' });
      fireEvent.click(kgsButton);

      await waitFor(() => {
        const weightInput = screen.getByPlaceholderText('Weight (kgs)');
        expect(weightInput).toHaveValue(null);
      });
    });
  });
});
