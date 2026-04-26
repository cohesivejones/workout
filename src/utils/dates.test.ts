import { getLocalDateString, formatShortDate, formatLongDate, formatDayOfMonth } from './dates';

describe('formatShortDate', () => {
  it('formats a date string as "MMM d"', () => {
    expect(formatShortDate('2026-04-26')).toBe('Apr 26');
  });
});

describe('formatLongDate', () => {
  it('formats a date string as "MMM d, yyyy"', () => {
    expect(formatLongDate('2026-04-26')).toBe('Apr 26, 2026');
  });
});

describe('formatDayOfMonth', () => {
  it('returns the numeric day of the month', () => {
    expect(formatDayOfMonth('2026-04-26')).toBe('26');
  });
});

describe('getLocalDateString', () => {
  it('returns the local date in YYYY-MM-DD format', () => {
    const date = new Date(2026, 3, 26, 1, 0, 0); // April 26 at 1am local time
    expect(getLocalDateString(date)).toBe('2026-04-26');
  });

  it('defaults to today when no date is provided', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 26, 1, 0, 0)); // April 26 at 1am local
    expect(getLocalDateString()).toBe('2026-04-26');
    vi.useRealTimers();
  });
});
