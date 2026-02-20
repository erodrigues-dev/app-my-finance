import {
  addMonths,
  format,
  getDaysInMonth,
  isAfter,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfDay,
} from "date-fns";

const MONTH_KEYS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;

export type MonthNameKey = (typeof MONTH_KEYS)[number];

const DATE_FORMAT = "yyyy-MM-dd";
const DATE_DISPLAY_FORMAT = "dd/MM/yy";

/** Parse YYYY-MM-DD to Date (start of day) */
export function parseDateStr(dateStr: string): Date {
  return startOfDay(parseISO(dateStr));
}

/** Format Date to YYYY-MM-DD */
export function formatDateStr(date: Date): string {
  return format(date, DATE_FORMAT);
}

/** Parse YYYY-MM-DD to { month: 0-11, year } */
export function getMonthYearFromDateStr(dateStr: string): { month: number; year: number } {
  const d = parseISO(dateStr);
  return { month: d.getMonth(), year: d.getFullYear() };
}

/** True if date (YYYY-MM-DD) is in a month after today's month */
export function isDateInFutureMonth(dateStr: string): boolean {
  const date = parseISO(dateStr);
  const now = startOfDay(new Date());
  return isAfter(startOfMonth(date), startOfMonth(now));
}

/** Key for pt locale (e.g. "january") from month index 0-11 */
export function getMonthNameKey(month: number): MonthNameKey {
  const i = Math.max(0, Math.min(11, Math.floor(month)));
  return MONTH_KEYS[i];
}

/** selectedMonth: { month: 0-11, year }. Returns YYYY-MM-DD: today if viewing current month, else first day of selected month */
export function getInitialDateForNewTransaction(selectedMonth: { month: number; year: number }): string {
  const now = new Date();
  const selected = new Date(selectedMonth.year, selectedMonth.month, 1);
  if (isSameMonth(selected, now)) {
    return formatDateStr(now);
  }
  return format(startOfMonth(selected), DATE_FORMAT);
}

/** Format YYYY-MM-DD to dd/MM/yy for display in list items */
export function formatDateShort(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    return format(d, DATE_DISPLAY_FORMAT);
  } catch {
    return dateStr;
  }
}

/** First and last+1 day of month for SQL range [start, end). month 0-11, year. */
export function getMonthRange(month: number, year: number): { startDate: string; endDate: string } {
  const start = new Date(year, month, 1);
  const end = addMonths(start, 1);
  return {
    startDate: format(start, DATE_FORMAT),
    endDate: format(end, DATE_FORMAT),
  };
}

/** Weeks in month for charts: array of { startDate, endDate } in YYYY-MM-DD. endDate is exclusive. */
export function getWeeksInMonth(month: number, year: number): { start: string; end: string }[] {
  const weeks: { start: string; end: string }[] = [];
  const daysInMonth = getDaysInMonth(new Date(year, month));
  for (let w = 0; w < 5; w++) {
    const startDay = w * 7 + 1;
    if (startDay > daysInMonth) break;
    const endDay = Math.min(startDay + 6, daysInMonth);
    const start = new Date(year, month, startDay);
    const endDayNext = endDay + 1;
    const end =
      endDayNext > daysInMonth
        ? addMonths(new Date(year, month, 1), 1)
        : new Date(year, month, endDayNext);
    weeks.push({
      start: format(start, DATE_FORMAT),
      end: format(end, DATE_FORMAT),
    });
  }
  return weeks;
}
