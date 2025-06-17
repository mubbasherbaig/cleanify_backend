import { DATE_TIME, TIME_FORMATS } from './constants';

// Date creation utilities
export const createDate = (
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0
): Date => {
  return new Date(year, month - 1, day, hour, minute, second);
};

export const parseDate = (dateString: string): Date => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  return date;
};

export const parseISODate = (isoString: string): Date => {
  return new Date(isoString);
};

// Date validation
export const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

export const isValidDateString = (dateString: string): boolean => {
  try {
    const date = new Date(dateString);
    return isValidDate(date);
  } catch {
    return false;
  }
};

// Date comparison utilities
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

export const isSameWeek = (date1: Date, date2: Date): boolean => {
  const startOfWeek1 = getStartOfWeek(date1);
  const startOfWeek2 = getStartOfWeek(date2);
  return isSameDay(startOfWeek1, startOfWeek2);
};

export const isSameMonth = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth();
};

export const isSameYear = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear();
};

export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

export const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
};

export const isTomorrow = (date: Date): boolean => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow);
};

export const isPast = (date: Date): boolean => {
  return date < new Date();
};

export const isFuture = (date: Date): boolean => {
  return date > new Date();
};

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return DATE_TIME.WEEKEND_DAYS.includes(day);
};

export const isWorkingDay = (date: Date): boolean => {
  const day = date.getDay();
  return DATE_TIME.WORKING_DAYS.includes(day);
};

export const isBusinessHours = (date: Date, startHour: number = 8, endHour: number = 18): boolean => {
  const hour = date.getHours();
  return hour >= startHour && hour < endHour && isWorkingDay(date);
};

// Date arithmetic
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addWeeks = (date: Date, weeks: number): Date => {
  return addDays(date, weeks * 7);
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const addYears = (date: Date, years: number): Date => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
};

export const addHours = (date: Date, hours: number): Date => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

export const addMinutes = (date: Date, minutes: number): Date => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

export const addSeconds = (date: Date, seconds: number): Date => {
  const result = new Date(date);
  result.setSeconds(result.getSeconds() + seconds);
  return result;
};

export const subtractDays = (date: Date, days: number): Date => {
  return addDays(date, -days);
};

export const subtractWeeks = (date: Date, weeks: number): Date => {
  return addWeeks(date, -weeks);
};

export const subtractMonths = (date: Date, months: number): Date => {
  return addMonths(date, -months);
};

export const subtractYears = (date: Date, years: number): Date => {
  return addYears(date, -years);
};

export const subtractHours = (date: Date, hours: number): Date => {
  return addHours(date, -hours);
};

export const subtractMinutes = (date: Date, minutes: number): Date => {
  return addMinutes(date, -minutes);
};

export const subtractSeconds = (date: Date, seconds: number): Date => {
  return addSeconds(date, -seconds);
};

// Date calculation utilities
export const diffInDays = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const diffInWeeks = (date1: Date, date2: Date): number => {
  return Math.floor(diffInDays(date1, date2) / 7);
};

export const diffInMonths = (date1: Date, date2: Date): number => {
  return Math.abs((date2.getFullYear() - date1.getFullYear()) * 12 + 
                  (date2.getMonth() - date1.getMonth()));
};

export const diffInYears = (date1: Date, date2: Date): number => {
  return Math.abs(date2.getFullYear() - date1.getFullYear());
};

export const diffInHours = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return diffTime / (1000 * 60 * 60);
};

export const diffInMinutes = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return diffTime / (1000 * 60);
};

export const diffInSeconds = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return diffTime / 1000;
};

// Date boundary utilities
export const getStartOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const getEndOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

export const getStartOfWeek = (date: Date, startDay: number = 1): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day + 7 - startDay) % 7;
  result.setDate(result.getDate() - diff);
  return getStartOfDay(result);
};

export const getEndOfWeek = (date: Date, startDay: number = 1): Date => {
  const startOfWeek = getStartOfWeek(date, startDay);
  return getEndOfDay(addDays(startOfWeek, 6));
};

export const getStartOfMonth = (date: Date): Date => {
  const result = new Date(date);
  result.setDate(1);
  return getStartOfDay(result);
};

export const getEndOfMonth = (date: Date): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1, 0);
  return getEndOfDay(result);
};

export const getStartOfYear = (date: Date): Date => {
  const result = new Date(date);
  result.setMonth(0, 1);
  return getStartOfDay(result);
};

export const getEndOfYear = (date: Date): Date => {
  const result = new Date(date);
  result.setMonth(11, 31);
  return getEndOfDay(result);
};

// Date range utilities
export const isDateInRange = (date: Date, start: Date, end: Date): boolean => {
  return date >= start && date <= end;
};

export const getDateRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  let current = new Date(start);
  
  while (current <= end) {
    dates.push(new Date(current));
    current = addDays(current, 1);
  }
  
  return dates;
};

export const getWeekDays = (date: Date): Date[] => {
  const startOfWeek = getStartOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek, i));
};

export const getMonthDays = (date: Date): Date[] => {
  const start = getStartOfMonth(date);
  const end = getEndOfMonth(date);
  return getDateRange(start, end);
};

export const getWorkingDays = (start: Date, end: Date): Date[] => {
  return getDateRange(start, end).filter(isWorkingDay);
};

export const getWeekends = (start: Date, end: Date): Date[] => {
  return getDateRange(start, end).filter(isWeekend);
};

// Timezone utilities
export const getTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const getTimezoneOffset = (date: Date = new Date()): number => {
  return date.getTimezoneOffset();
};

export const convertToTimezone = (date: Date, timezone: string): Date => {
  const utc = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  const offset = new Date().toLocaleString('en', { timeZone: timezone });
  return new Date(utc.getTime() + (new Date(offset).getTime() - new Date().getTime()));
};

export const toUTC = (date: Date): Date => {
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
};

export const fromUTC = (date: Date): Date => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
};

// Formatting utilities
export const formatRelativeTime = (date: Date, now: Date = new Date()): string => {
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) {
    return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
  }
  if (diffMonths > 0) {
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  }
  if (diffWeeks > 0) {
    return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  }
  if (diffDays > 0) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  }
  if (diffSeconds > 5) {
    return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ago`;
  }
  
  return 'Just now';
};

export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

export const formatTime12Hour = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export const formatTime24Hour = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export const formatDateShort = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
};

export const formatDateLong = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatDateTime = (date: Date): string => {
  return `${formatDateShort(date)} ${formatTime12Hour(date)}`;
};

export const formatISODate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatISODateTime = (date: Date): string => {
  return date.toISOString();
};

// Business logic utilities
export const getNextWorkingDay = (date: Date): Date => {
  let next = addDays(date, 1);
  while (!isWorkingDay(next)) {
    next = addDays(next, 1);
  }
  return next;
};

export const getPreviousWorkingDay = (date: Date): Date => {
  let prev = subtractDays(date, 1);
  while (!isWorkingDay(prev)) {
    prev = subtractDays(prev, 1);
  }
  return prev;
};

export const getWorkingDaysUntil = (from: Date, to: Date): number => {
  let count = 0;
  let current = new Date(from);
  
  while (current < to) {
    if (isWorkingDay(current)) {
      count++;
    }
    current = addDays(current, 1);
  }
  
  return count;
};

export const addWorkingDays = (date: Date, days: number): Date => {
  let result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result = addDays(result, 1);
    if (isWorkingDay(result)) {
      addedDays++;
    }
  }
  
  return result;
};

export const getQuarter = (date: Date): number => {
  return Math.floor(date.getMonth() / 3) + 1;
};

export const getStartOfQuarter = (date: Date): Date => {
  const quarter = getQuarter(date);
  const startMonth = (quarter - 1) * 3;
  return new Date(date.getFullYear(), startMonth, 1);
};

export const getEndOfQuarter = (date: Date): Date => {
  const startOfNext = addMonths(getStartOfQuarter(date), 3);
  return subtractDays(startOfNext, 1);
};

export const getWeekNumber = (date: Date): number => {
  const startOfYear = getStartOfYear(date);
  const diffDays = diffInDays(startOfYear, date);
  return Math.ceil((diffDays + startOfYear.getDay()) / 7);
};

export const getDayOfYear = (date: Date): number => {
  const startOfYear = getStartOfYear(date);
  return diffInDays(startOfYear, date) + 1;
};

// Age calculation
export const calculateAge = (birthDate: Date, referenceDate: Date = new Date()): number => {
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Holiday utilities (basic implementation)
export const isNewYear = (date: Date): boolean => {
  return date.getMonth() === 0 && date.getDate() === 1;
};

export const isChristmas = (date: Date): boolean => {
  return date.getMonth() === 11 && date.getDate() === 25;
};

// Utility functions for simulation time
export const simulationTimeToReal = (simTime: Date, multiplier: number): Date => {
  const baseTime = new Date('2024-01-01T00:00:00Z');
  const diffMs = simTime.getTime() - baseTime.getTime();
  const realDiffMs = diffMs / multiplier;
  return new Date(Date.now() - realDiffMs);
};

export const realTimeToSimulation = (realTime: Date, multiplier: number): Date => {
  const baseTime = new Date('2024-01-01T00:00:00Z');
  const diffMs = Date.now() - realTime.getTime();
  const simDiffMs = diffMs * multiplier;
  return new Date(baseTime.getTime() + simDiffMs);
};

// Export commonly used date constants
export const TODAY = new Date();
export const YESTERDAY = subtractDays(TODAY, 1);
export const TOMORROW = addDays(TODAY, 1);
export const THIS_WEEK_START = getStartOfWeek(TODAY);
export const THIS_WEEK_END = getEndOfWeek(TODAY);
export const THIS_MONTH_START = getStartOfMonth(TODAY);
export const THIS_MONTH_END = getEndOfMonth(TODAY);
export const THIS_YEAR_START = getStartOfYear(TODAY);
export const THIS_YEAR_END = getEndOfYear(TODAY);