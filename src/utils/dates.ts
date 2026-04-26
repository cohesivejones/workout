import { format, parseISO } from 'date-fns';

export const getLocalDateString = (date: Date = new Date()): string => {
  return format(date, 'yyyy-MM-dd');
};

export const formatShortDate = (dateString: string): string =>
  format(parseISO(dateString), 'MMM d');

export const formatLongDate = (dateString: string): string =>
  format(parseISO(dateString), 'MMM d, yyyy');

export const formatDayOfMonth = (dateString: string): string => format(parseISO(dateString), 'd');
