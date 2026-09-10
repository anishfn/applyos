import {
  addDays as addDaysFn,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek as endOfWeekFn,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek as startOfWeekFn,
  subDays,
} from "date-fns";

export {
  addDaysFn as addDays,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
};

/** App-wide week start. Kept configurable through the profile. */
export type WeekStart = 0 | 1;

export const startOfWeek = (date: Date, weekStartsOn: WeekStart = 1) =>
  startOfWeekFn(date, { weekStartsOn });

export const endOfWeek = (date: Date, weekStartsOn: WeekStart = 1) =>
  endOfWeekFn(date, { weekStartsOn });

/** `YYYY-MM-DD` in local time, never shifts a date across a timezone boundary. */
export const toDateOnly = (date: Date): string => format(date, "yyyy-MM-dd");

export const todayDateOnly = (): string => toDateOnly(new Date());

/** Parses a `YYYY-MM-DD` string as local midnight. */
export const fromDateOnly = (value: string): Date => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};

export const toDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return fromDateOnly(value);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const isPastDate = (value: string | Date | null | undefined): boolean => {
  const date = toDate(value);
  if (!date) return false;
  return startOfDay(date).getTime() < startOfDay(new Date()).getTime();
};

export const isToday = (value: string | Date | null | undefined): boolean => {
  const date = toDate(value);
  return date ? isSameDay(date, new Date()) : false;
};

export const isTomorrow = (value: string | Date | null | undefined): boolean => {
  const date = toDate(value);
  return date ? isSameDay(date, addDaysFn(new Date(), 1)) : false;
};

/** Whole days from today. Negative when overdue. */
export const daysFromToday = (value: string | Date | null | undefined): number | null => {
  const date = toDate(value);
  if (!date) return null;
  return differenceInCalendarDays(startOfDay(date), startOfDay(new Date()));
};

export const daysSince = (value: string | Date | null | undefined): number | null => {
  const date = toDate(value);
  if (!date) return null;
  return differenceInCalendarDays(startOfDay(new Date()), startOfDay(date));
};

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */

export const formatDate = (value: string | Date | null | undefined, pattern = "MMM d"): string => {
  const date = toDate(value);
  return date ? format(date, pattern) : "-";
};

export const formatLongDate = (value: string | Date | null | undefined) =>
  formatDate(value, "EEEE, MMMM d");

export const formatTime = (value: string | Date | null | undefined): string => {
  const date = toDate(value);
  return date ? format(date, "h:mm a") : "-";
};

export const formatDateTime = (value: string | Date | null | undefined): string => {
  const date = toDate(value);
  if (!date) return "-";
  return `${format(date, "MMM d")} · ${format(date, "h:mm a")}`;
};

/** Includes the year only when it isn't the current one. */
export const formatSmartDate = (value: string | Date | null | undefined): string => {
  const date = toDate(value);
  if (!date) return "-";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return format(date, sameYear ? "MMM d" : "MMM d, yyyy");
};

/** "Today", "Tomorrow", "3d overdue", "in 5d", "Mar 2". */
export const formatDueDate = (value: string | Date | null | undefined): string => {
  const days = daysFromToday(value);
  if (days === null) return "-";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days <= 7) return `in ${days}d`;
  return formatSmartDate(value);
};

export const formatRelative = (value: string | Date | null | undefined): string => {
  const date = toDate(value);
  if (!date) return "-";
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = differenceInCalendarDays(startOfDay(new Date()), startOfDay(date));
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};

/** Inclusive list of days between two dates. */
export const eachDay = (start: Date, end: Date): Date[] => {
  const days: Date[] = [];
  let cursor = startOfDay(start);
  const last = startOfDay(end);
  while (cursor.getTime() <= last.getTime()) {
    days.push(cursor);
    cursor = addDaysFn(cursor, 1);
  }
  return days;
};

/** The 6×7 grid a month view renders. */
export const monthGrid = (month: Date, weekStartsOn: WeekStart = 1): Date[] => {
  const start = startOfWeek(startOfMonth(month), weekStartsOn);
  const end = endOfWeek(endOfMonth(month), weekStartsOn);
  return eachDay(start, end);
};

export const WEEKDAY_LABELS = (weekStartsOn: WeekStart = 1) => {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return [...labels.slice(weekStartsOn), ...labels.slice(0, weekStartsOn)];
};
