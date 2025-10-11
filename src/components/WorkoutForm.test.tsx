import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkoutForm from './WorkoutForm';
import { Workout, WorkoutFormProps } from '../types';
import * as UserContext from '../contexts/useUserContext';
import * as Api from '../api';

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
  vi.spyOn(UserContext, 'useUserContext').mockReturnValue({
    user: { id: 1, name: 'Bob Jones' },
    login: vi.fn(),
    logout: vi.fn(),
    loading: false,
  });
  vi.spyOn(Api, 'fetchRecentExerciseData').mockRejectedValue(
    new Error('Failed to fetch recent data')
  );

  const defaultProps: WorkoutFormProps = {
    onSubmit: mockOnSubmit,
    onSaveExercise: mockOnSaveExercise,
    savedExercises: mockSavedExercises,
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

    // Check add exercise button
    expect(screen.getByText('Add Exercise')).toBeInTheDocument();
    expect(screen.getByText('Add Exercise')).toBeDisabled();

    // Check save workout button
    expect(screen.getByText('Save Workout')).toBeInTheDocument();
    expect(screen.getByText('Save Workout')).toBeDisabled();

    // Check no exercises message
    expect(screen.getByText('No exercises added yet')).toBeInTheDocument();
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

    // Check exercises are displayed
    expect(screen.getByText('Push-ups - 10 reps')).toBeInTheDocument();
    expect(screen.getByText('Squats - 15 reps - 20 lbs')).toBeInTheDocument();

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

    // Wait for the exercise to be added
    await waitFor(() => {
      expect(mockOnSaveExercise).toHaveBeenCalledWith('Push-ups');
      expect(screen.getByText('Push-ups - 12 reps')).toBeInTheDocument();
    });

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

    // Check that both exercises are displayed
    expect(screen.getByText('Push-ups - 10 reps')).toBeInTheDocument();
    expect(screen.getByText('Squats - 15 reps')).toBeInTheDocument();

    // Get the remove buttons
    const removeButtons = screen.getAllByTitle('Remove exercise');
    expect(removeButtons).toHaveLength(2);

    // Click the first remove button
    fireEvent.click(removeButtons[0]);

    // Check that the first exercise is removed
    expect(screen.queryByText('Push-ups - 10 reps')).not.toBeInTheDocument();
    expect(screen.getByText('Squats - 15 reps')).toBeInTheDocument();
  });

  it('submits the form with correct data', async () => {
    const today = new Date().toISOString().split('T')[0];

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

    // Wait for the exercise to be added
    await waitFor(() => {
      expect(screen.getByText('Squats - 15 reps - 20 lbs')).toBeInTheDocument();
    });

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
            time_minutes: null,
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
});
