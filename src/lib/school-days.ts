/**
 * Pure school timetable constants — safe to import from client components.
 * (school.ts itself imports server-only helpers and must stay server-side.)
 */

export const SCHOOL_DAYS = [
  { day: 1, label: "Monday", short: "Mon" },
  { day: 2, label: "Tuesday", short: "Tue" },
  { day: 3, label: "Wednesday", short: "Wed" },
  { day: 4, label: "Thursday", short: "Thu" },
  { day: 5, label: "Friday", short: "Fri" },
  { day: 6, label: "Saturday", short: "Sat" },
  { day: 7, label: "Sunday", short: "Sun" },
] as const;

export const MAX_PERIODS = 12;
