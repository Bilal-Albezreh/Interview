// Hand-rolled UTC formatting, so the server and browser render identical text.
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const pad = (n: number) => String(n).padStart(2, "0");

function day(d: Date): string {
  return `${DAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "Thu Sep 24, 18:00 UTC" */
export function formatTs(ts: string): string {
  const d = new Date(Number(ts) * 1000);
  return `${day(d)}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

/** "Mon Sep 21 – Sun Sep 27, 2026 (UTC)" */
export function formatWeek(start: Date): string {
  const last = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  return `${day(start)} – ${day(last)}, ${last.getUTCFullYear()} (UTC)`;
}

/** "Week of September 21" */
export function formatWeekOf(start: Date): string {
  return `Week of ${MONTHS_LONG[start.getUTCMonth()]} ${start.getUTCDate()}`;
}

/** "Thu, Sep 24" */
export function formatDay(ts: string): string {
  const d = new Date(Number(ts) * 1000);
  return `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
