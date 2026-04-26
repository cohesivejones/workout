import { render, screen } from '@testing-library/react';
import SleepScoreForm from './SleepScoreForm';

vi.mock('./SleepScaleSelector', () => ({
  __esModule: true,
  default: ({ onChange }: { onChange: (value: number) => void }) => (
    <select
      data-testid="mock-sleep-scale-select"
      onChange={(e) => onChange(parseInt(e.target.value))}
    >
      {[1, 2, 3, 4, 5].map((score) => (
        <option key={score} value={score}>
          {score}
        </option>
      ))}
    </select>
  ),
}));

describe('SleepScoreForm', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(true);
  const mockOnCancel = vi.fn();
  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("defaults to today's local date for a new sleep score", () => {
    vi.stubEnv('TZ', 'Australia/Perth');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-25T17:00:00.000Z'));

    render(<SleepScoreForm {...defaultProps} />);

    const dateInput = screen.getByLabelText(/Date:/i) as HTMLInputElement;
    expect(dateInput.value).toBe('2026-04-26');
  });
});
