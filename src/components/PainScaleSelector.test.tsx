import { render, screen, fireEvent } from '@testing-library/react';
import PainScaleSelector from './PainScaleSelector';
import { useForm, Control, FieldValues } from 'react-hook-form';

// Mock the painScaleFaces.utils module
vi.mock('./painScaleFaces.utils', () => ({
  getPainFace: vi.fn(() => <div data-testid="mock-pain-face" />),
}));

// Create a wrapper component to provide the react-hook-form context
const TestWrapper = ({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number) => void;
}) => {
  const { control } = useForm();
  return (
    <PainScaleSelector
      name="score"
      control={control as Control<FieldValues>}
      value={value}
      onChange={onChange}
    />
  );
};

describe('PainScaleSelector', () => {
  it('renders pain scale options', () => {
    const handleChange = vi.fn();
    render(<TestWrapper value={null} onChange={handleChange} />);

    // Should render 11 pain scale options (0-10)
    const options = screen.getAllByRole('button');
    expect(options).toHaveLength(11);

    // Check that the numbers 0-10 are displayed
    for (let i = 0; i <= 10; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument();
    }
  });

  it('highlights the selected pain score', () => {
    const handleChange = vi.fn();
    render(<TestWrapper value={3} onChange={handleChange} />);

    // The option with value 3 should have the selected class
    const options = screen.getAllByRole('button');
    expect(options[3]).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onChange when a pain score is selected', () => {
    const handleChange = vi.fn();
    render(<TestWrapper value={null} onChange={handleChange} />);

    // Click on the option with value 5
    const options = screen.getAllByRole('button');
    fireEvent.click(options[5]);

    // Check that onChange was called with the correct value
    expect(handleChange).toHaveBeenCalledWith(5);
  });

  it('displays the pain description when a score is selected', () => {
    const handleChange = vi.fn();
    render(<TestWrapper value={4} onChange={handleChange} />);

    // Check that the description container is rendered
    // Use getAllByTestId since there are multiple elements with this test ID
    expect(screen.getAllByTestId('mock-pain-face').length).toBeGreaterThan(0);

    // The description should contain text about moderate pain
    expect(screen.getByText(/Moderate pain/i)).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    const handleChange = vi.fn();
    render(<TestWrapper value={null} onChange={handleChange} />);

    // Press Enter on the option with value 7
    const options = screen.getAllByRole('button');
    fireEvent.keyDown(options[7], { key: 'Enter' });

    // Check that onChange was called with the correct value
    expect(handleChange).toHaveBeenCalledWith(7);

    // Press Space on the option with value 2
    fireEvent.keyDown(options[2], { key: ' ' });

    // Check that onChange was called with the correct value
    expect(handleChange).toHaveBeenCalledWith(2);
  });

  it('displays error message when provided', () => {
    const handleChange = vi.fn();

    // Create a wrapper component that includes the error prop
    const TestWrapperWithError = () => {
      const { control } = useForm();
      return (
        <PainScaleSelector
          name="score"
          control={control as Control<FieldValues>}
          value={null}
          onChange={handleChange}
          error="Please select a pain score"
        />
      );
    };

    // Create a wrapper component without the error prop
    const TestWrapperWithoutError = () => {
      const { control } = useForm();
      return (
        <PainScaleSelector
          name="score"
          control={control as Control<FieldValues>}
          value={null}
          onChange={handleChange}
        />
      );
    };

    // Render with error
    const { unmount } = render(<TestWrapperWithError />);

    // Check that the error message is displayed
    expect(screen.getByText('Please select a pain score')).toBeInTheDocument();

    // Unmount and render without error
    unmount();
    render(<TestWrapperWithoutError />);

    // Check that the error message is no longer displayed
    expect(screen.queryByText('Please select a pain score')).not.toBeInTheDocument();
  });
});
