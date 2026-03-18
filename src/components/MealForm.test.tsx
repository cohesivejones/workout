import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MealForm from './MealForm';
import { Meal } from '../types';

describe('MealForm', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(true);
  const mockOnCancel = vi.fn();
  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with correct initial state for new meal', () => {
    render(<MealForm {...defaultProps} />);

    // Check title
    expect(screen.getByText('Add Meal')).toBeInTheDocument();

    // Check form elements
    expect(screen.getByLabelText(/Date:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Calories:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Protein \(g\):/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Carbs \(g\):/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fat \(g\):/i)).toBeInTheDocument();
    expect(screen.getByText('Save Meal')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders the form with correct initial state for existing meal', () => {
    const existingMeal: Meal = {
      id: 1,
      userId: 1,
      date: '2025-04-10',
      description: 'Chicken and Rice',
      calories: 650,
      protein: 45,
      carbs: 70,
      fat: 15,
    };

    render(<MealForm {...defaultProps} existingMeal={existingMeal} />);

    // Check title
    expect(screen.getByText('Edit Meal')).toBeInTheDocument();

    // Check form elements with pre-filled values
    const dateInput = screen.getByLabelText(/Date:/i) as HTMLInputElement;
    expect(dateInput.value).toBe('2025-04-10');

    const descriptionInput = screen.getByLabelText(/Description:/i) as HTMLInputElement;
    expect(descriptionInput.value).toBe('Chicken and Rice');

    const caloriesInput = screen.getByLabelText(/Calories:/i) as HTMLInputElement;
    expect(caloriesInput.value).toBe('650');

    const proteinInput = screen.getByLabelText(/Protein \(g\):/i) as HTMLInputElement;
    expect(proteinInput.value).toBe('45');

    const carbsInput = screen.getByLabelText(/Carbs \(g\):/i) as HTMLInputElement;
    expect(carbsInput.value).toBe('70');

    const fatInput = screen.getByLabelText(/Fat \(g\):/i) as HTMLInputElement;
    expect(fatInput.value).toBe('15');

    // Check buttons
    expect(screen.getByText('Update Meal')).toBeInTheDocument();
  });

  it('calls onSubmit with correct data when form is submitted', async () => {
    render(<MealForm {...defaultProps} />);

    // Fill out the form
    const dateInput = screen.getByLabelText(/Date:/i) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2025-04-15' } });

    const descriptionInput = screen.getByLabelText(/Description:/i);
    fireEvent.change(descriptionInput, { target: { value: 'Breakfast - Oats' } });

    const caloriesInput = screen.getByLabelText(/Calories:/i);
    fireEvent.change(caloriesInput, { target: { value: '400' } });

    const proteinInput = screen.getByLabelText(/Protein \(g\):/i);
    fireEvent.change(proteinInput, { target: { value: '15' } });

    const carbsInput = screen.getByLabelText(/Carbs \(g\):/i);
    fireEvent.change(carbsInput, { target: { value: '65' } });

    const fatInput = screen.getByLabelText(/Fat \(g\):/i);
    fireEvent.change(fatInput, { target: { value: '10' } });

    // Submit the form
    const submitButton = screen.getByText('Save Meal');
    fireEvent.click(submitButton);

    // Check that onSubmit was called with the correct data
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        date: '2025-04-15',
        description: 'Breakfast - Oats',
        calories: 400,
        protein: 15,
        carbs: 65,
        fat: 10,
      });
    });
  });

  it('validates required fields', async () => {
    render(<MealForm {...defaultProps} />);

    // Submit the form without filling required fields
    const submitButton = screen.getByText('Save Meal');
    fireEvent.click(submitButton);

    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText(/Description is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Calories is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Protein is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Carbs is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Fat is required/i)).toBeInTheDocument();
    });
  });

  it('validates numeric fields are positive', async () => {
    render(<MealForm {...defaultProps} />);

    // Fill in description (required)
    const descriptionInput = screen.getByLabelText(/Description:/i);
    fireEvent.change(descriptionInput, { target: { value: 'Test Meal' } });

    // Fill in negative values
    const caloriesInput = screen.getByLabelText(/Calories:/i);
    fireEvent.change(caloriesInput, { target: { value: '-100' } });

    const proteinInput = screen.getByLabelText(/Protein \(g\):/i);
    fireEvent.change(proteinInput, { target: { value: '-5' } });

    // Submit the form
    const submitButton = screen.getByText('Save Meal');
    fireEvent.click(submitButton);

    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText(/Calories must be positive/i)).toBeInTheDocument();
      expect(screen.getByText(/Protein must be positive/i)).toBeInTheDocument();
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<MealForm {...defaultProps} />);

    // Click the cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Check that onCancel was called
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows error message when submission fails', async () => {
    // Mock onSubmit to return false (failure)
    const mockFailedSubmit = vi.fn().mockResolvedValue(false);
    render(<MealForm onSubmit={mockFailedSubmit} onCancel={mockOnCancel} />);

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Description:/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Calories:/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Protein \(g\):/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/Carbs \(g\):/i), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText(/Fat \(g\):/i), { target: { value: '5' } });

    // Submit the form
    const submitButton = screen.getByText('Save Meal');
    fireEvent.click(submitButton);

    // Check that error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Failed to save meal. Please try again.')).toBeInTheDocument();
    });
  });

  it('disables buttons during submission', async () => {
    // Mock onSubmit to return a promise that doesn't resolve immediately
    const mockDelayedSubmit = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(true), 100);
      });
    });

    render(<MealForm onSubmit={mockDelayedSubmit} onCancel={mockOnCancel} />);

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Description:/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Calories:/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Protein \(g\):/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/Carbs \(g\):/i), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText(/Fat \(g\):/i), { target: { value: '5' } });

    // Submit the form
    const submitButton = screen.getByText('Save Meal');
    fireEvent.click(submitButton);

    // Check that the submit button shows "Saving..." and is disabled
    expect(screen.getByText('Saving...')).toBeInTheDocument();

    // Check that the cancel button is disabled
    const cancelButton = screen.getByText('Cancel') as HTMLButtonElement;
    expect(cancelButton.disabled).toBe(true);

    // Wait for the submission to complete
    await waitFor(() => {
      expect(mockDelayedSubmit).toHaveBeenCalled();
    });
  });
});
