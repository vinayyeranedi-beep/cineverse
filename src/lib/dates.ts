/**
 * Cinema local timezone helper: Asia/Kolkata (IST = UTC+05:30)
 * All day and hour calculations across staff counter and admin analytics MUST use this.
 */

export const CINEMA_TIMEZONE = 'Asia/Kolkata';

export type DateInput = Date | number | string;

function toDate(input?: DateInput): Date {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  if (typeof input === 'number') return new Date(input);
  return new Date(input);
}

/**
 * Returns YYYY, MM, DD string parts in Asia/Kolkata
 */
export function getISTDateParts(input?: DateInput): { year: string; month: string; day: string } {
  const date = toDate(input);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CINEMA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [year, month, day] = formatter.format(date).split('-');
  return { year, month, day };
}

/**
 * Returns date in YYYY-MM-DD format based on Asia/Kolkata (e.g. "2026-10-14")
 */
export function getISODateString(input?: DateInput): string {
  const { year, month, day } = getISTDateParts(input);
  return `${year}-${month}-${day}`;
}

/**
 * Returns start of day timestamp (00:00:00.000 IST) in milliseconds
 */
export function startOfDay(date?: DateInput): number {
  const { year, month, day } = getISTDateParts(date);
  return new Date(`${year}-${month}-${day}T00:00:00.000+05:30`).getTime();
}

/**
 * Returns end of day timestamp (23:59:59.999 IST) in milliseconds
 */
export function endOfDay(date?: DateInput): number {
  const { year, month, day } = getISTDateParts(date);
  return new Date(`${year}-${month}-${day}T23:59:59.999+05:30`).getTime();
}

/**
 * Formats time in Asia/Kolkata, e.g. "07:42 PM"
 */
export function formatTime(timestamp?: DateInput): string {
  if (!timestamp) return '--:--';
  const date = toDate(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CINEMA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Formats day in Asia/Kolkata, e.g. "Tue, 14 Oct 2026" or "Tuesday, 14 Oct 2026"
 */
export function formatDay(dateInput?: DateInput, style: 'short' | 'long' = 'short'): string {
  const date = toDate(dateInput);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CINEMA_TIMEZONE,
    weekday: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return `${get('weekday')}, ${get('day')} ${get('month')} ${get('year')}`;
}

/**
 * Returns integer hour (0 - 23) in Asia/Kolkata
 */
export function getHour(timestamp?: DateInput): number {
  if (!timestamp) return 0;
  const date = toDate(timestamp);
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: CINEMA_TIMEZONE,
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(date);
  return parseInt(hourStr, 10);
}

/**
 * Checks if a given date is today in Asia/Kolkata
 */
export function isToday(dateInput?: DateInput): boolean {
  return getISODateString(dateInput) === getISODateString(new Date());
}

/**
 * Checks if a given date is yesterday in Asia/Kolkata
 */
export function isYesterday(dateInput?: DateInput): boolean {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return getISODateString(dateInput) === getISODateString(yesterday);
}

/**
 * Adds or subtracts days in Asia/Kolkata
 */
export function addDays(dateInput: DateInput, days: number): Date {
  const { year, month, day } = getISTDateParts(dateInput);
  const noonIST = new Date(`${year}-${month}-${day}T12:00:00.000+05:30`);
  return new Date(noonIST.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Formats relative time elapsed (e.g. "Just now", "6 min ago", "2 hr ago")
 */
export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diffMs = Math.max(0, now - timestamp);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffMin < 1) return 'Just now';
  if (diffMin === 1) return '1 min ago';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr === 1) return '1 hr ago';
  if (diffHr < 24) return `${diffHr} hrs ago`;
  return formatTime(timestamp);
}
