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

/** The week the calendar opens on: this week, or next week at the weekend. */
export function openingWeek(day: string): string {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6
    ? weekStart(addDays(day, 7))
    : weekStart(day);
}

/** 2026-09-28 as 28/9. */
export function shortDate(day: string): string {
  const [, month, date] = day.split("-");
  return `${Number(date)}/${Number(month)}`;
}

/** The gym trains Monday to Friday. */
export const WEEKDAYS = ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ"];
