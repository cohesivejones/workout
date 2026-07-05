/**
 * Format a Date as a `yyyy-MM-dd` string using the server's local calendar date.
 *
 * Workout, meal and weight dates are stored as local calendar dates, so any
 * range boundary compared against them must also be built from local date
 * components. Using `toISOString()` would format in UTC and drop "today" when
 * the local date is ahead of the UTC date (e.g. evenings in UTC+8).
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
