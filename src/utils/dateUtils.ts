import { startOfWeek, endOfWeek, format, isSameWeek } from 'date-fns';

export const getWeekStart = (date: Date = new Date()): Date => {
  return startOfWeek(date, { weekStartsOn: 0 }); // Sunday = 0
};

export const getWeekEnd = (date: Date = new Date()): Date => {
  return endOfWeek(date, { weekStartsOn: 0 });
};

export const formatWeekRange = (weekStart: Date): string => {
  const weekEnd = getWeekEnd(weekStart);
  return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
};

export const isCurrentWeek = (date: Date): boolean => {
  return isSameWeek(date, new Date(), { weekStartsOn: 0 });
};

export const getWeekKey = (date: Date): string => {
  return format(getWeekStart(date), 'yyyy-MM-dd');
};

// Utility to safely parse a date string from HTML date input
// Ensures the date is interpreted in local timezone, not UTC
export const parseDateInput = (dateString: string): Date => {
  // Split the date string (YYYY-MM-DD) and create Date in local timezone
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
};

// Utility to format a Date object for HTML date input
// Ensures consistent local timezone handling
export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};