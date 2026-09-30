/** Dates as YYYY-MM-DD strings, the format the server uses for class days. */

const pad = (n: number) => String(n).padStart(2, "0");

/** Today on the phone, which for members is the gym's own day. */
export function today(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Adds days to a date. Done in UTC so a daylight-saving change cannot shift it. */
export function addDays(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The Monday of the week that `day` falls in. */
export function weekStart(day: string): string {
  const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(day, -weekday);
}

/** The day itself from Monday to Friday, or the next Monday at the weekend. */
export function firstTrainingDay(day: string): string {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekday === 6 ? addDays(day, 2) : weekday === 0 ? addDays(day, 1) : day;
}

/** The 1st of the month that `day` falls in. */
export function monthStart(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

/** The 1st of the month `months` after the month that `day` falls in. */
export function addMonths(day: string, months: number): string {
  const d = new Date(`${monthStart(day)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

const MONTH_NAMES = [
  "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος",
  "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος",
];

/** 2026-09-28 as Σεπτέμβριος 2026. */
export function monthName(day: string): string {
  return `${MONTH_NAMES[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}`;
}

/** 2026-09-28 as 28/9. */
export function shortDate(day: string): string {
  const [, month, date] = day.split("-");
  return `${Number(date)}/${Number(month)}`;
}

/** The gym trains Monday to Friday. */
export const WEEKDAYS = ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ"];
export const WEEKDAY_NAMES = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή"];

/** The full weekday name of a Monday-to-Friday date. */
export function weekdayName(day: string): string {
  return WEEKDAY_NAMES[(new Date(day + "T00:00:00Z").getUTCDay() + 6) % 7];
}

/** Minutes from now until a class day and HH:MM start, on the phone's clock. */
export function minutesUntil(day: string, time: string): number {
  return (new Date(`${day}T${time}:00`).getTime() - Date.now()) / 60000;
}
