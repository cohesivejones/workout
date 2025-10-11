import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PainScoreForm from './PainScoreForm';
import { PainScore } from '../types';

interface MockPainScaleSelectorProps {
  onChange: (value: number) => void;
  error?: string;
}

// Mock the PainScaleSelector component
vi.mock('./PainScaleSelector', () => {
  return {
    __esModule: true,

    default: ({ onChange, error }: MockPainScaleSelectorProps) => (
      <div data-testid="mock-pain-scale-selector">
        <select
          data-testid="mock-pain-scale-select"
          onChange={(e) => onChange(parseInt(e.target.value))}
        >
          <option value="">Select pain level</option>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
            <option key={score} value={score}>
              {score}
            </option>
          ))}
        </select>
        {error && <div>{error}</div>}
      </div>
    ),
  };
});

describe('PainScoreForm', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(true);
  const mockOnCancel = vi.fn();
  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with correct initial state for new pain score', () => {
    render(<PainScoreForm {...defaultProps} />);

    // Check title
    expect(screen.getByText('Add Pain Score')).toBeInTheDocument();

    // Check form elements
    expect(screen.getByLabelText(/Date:/i)).toBeInTheDocument();
    expect(screen.getByText(/Pain Score \(0-10\):/i)).toBeInTheDocument();
    expect(screen.getByTestId('mock-pain-scale-selector')).toBeInTheDocument();
    expect(screen.getByLabelText(/Notes \(optional\):/i)).toBeInTheDocument();
    expect(screen.getByText('Save Pain Score')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders the form with correct initial state for existing pain score', () => {
    const existingPainScore: PainScore = {
      id: 1,
      date: '2025-04-10',
      score: 3,
      notes: 'Test notes',
    };

    render(<PainScoreForm {...defaultProps} existingPainScore={existingPainScore} />);

    // Check title
    expect(screen.getByText('Edit Pain Score')).toBeInTheDocument();

    // Check form elements with pre-filled values
    const dateInput = screen.getByLabelText(/Date:/i) as HTMLInputElement;
    expect(dateInput.value).toBe('2025-04-10');

    // Check notes field
    const notesInput = screen.getByLabelText(/Notes \(optional\):/i) as HTMLTextAreaElement;
    expect(notesInput.value).toBe('Test notes');

    // Check buttons
    expect(screen.getByText('Update Pain Score')).toBeInTheDocument();
  });

  it('calls onSubmit with correct data when form is submitted', async () => {
    render(<PainScoreForm {...defaultProps} />);

    // Fill out the form
    const dateInput = screen.getByLabelText(/Date:/i) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2025-04-15' } });

    // Select pain score
    const painScoreSelect = screen.getByTestId('mock-pain-scale-select');
    fireEvent.change(painScoreSelect, { target: { value: '4' } });

    // Add notes
    const notesInput = screen.getByLabelText(/Notes \(optional\):/i);
    fireEvent.change(notesInput, { target: { value: 'Some test notes' } });

    // Submit the form
    const submitButton = screen.getByText('Save Pain Score');
    fireEvent.click(submitButton);

    // Check that onSubmit was called with the correct data
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        date: '2025-04-15',
        score: 4,
        notes: 'Some test notes',
      });
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<PainScoreForm {...defaultProps} />);

    // Click the cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Check that onCancel was called
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows error message when submission fails', async () => {
    // Mock onSubmit to return false (failure)
    const mockFailedSubmit = vi.fn().mockResolvedValue(false);
    render(<PainScoreForm onSubmit={mockFailedSubmit} onCancel={mockOnCancel} />);

    // Select pain score (required field)
    const painScoreSelect = screen.getByTestId('mock-pain-scale-select');
    fireEvent.change(painScoreSelect, { target: { value: '3' } });

    // Submit the form
    const submitButton = screen.getByText('Save Pain Score');
    fireEvent.click(submitButton);

    // Check that error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Failed to save pain score. Please try again.')).toBeInTheDocument();
    });
  });

  it('handles exceptions during submission', async () => {
    // Mock onSubmit to throw an error
    const mockErrorSubmit = vi.fn().mockRejectedValue(new Error('Test error'));
    render(<PainScoreForm onSubmit={mockErrorSubmit} onCancel={mockOnCancel} />);

    // Select pain score (required field)
    const painScoreSelect = screen.getByTestId('mock-pain-scale-select');
    fireEvent.change(painScoreSelect, { target: { value: '3' } });

    // Submit the form
    const submitButton = screen.getByText('Save Pain Score');
    fireEvent.click(submitButton);

    // Check that error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  it('disables buttons during submission', async () => {
    // Mock onSubmit to return a promise that doesn't resolve immediately
    const mockDelayedSubmit = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(true), 100);
      });
    });

    render(<PainScoreForm onSubmit={mockDelayedSubmit} onCancel={mockOnCancel} />);

    // Select pain score (required field)
    const painScoreSelect = screen.getByTestId('mock-pain-scale-select');
    fireEvent.change(painScoreSelect, { target: { value: '3' } });

    // Submit the form
    const submitButton = screen.getByText('Save Pain Score');
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
