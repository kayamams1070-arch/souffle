/**
 * Date helpers. All persisted dates are ISO 8601 strings; day keys are local
 * calendar days formatted as YYYY-MM-DD so that streaks follow the user's clock.
 */

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

export function nowIso(): string {
  return new Date().toISOString();
}

export function toDate(value: string | number | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar day key (YYYY-MM-DD). */
export function dayKey(value: string | number | Date = new Date()): string {
  const d = toDate(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse a day key back into a local Date at 00:00. */
export function dayKeyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function addDays(value: string | number | Date, days: number): Date {
  const d = new Date(toDate(value).getTime());
  d.setDate(d.getDate() + days);
  return d;
}

export function addDaysToKey(key: string, days: number): string {
  return dayKey(addDays(dayKeyToDate(key), days));
}

export function startOfDay(value: string | number | Date): Date {
  const d = new Date(toDate(value).getTime());
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Number of whole local calendar days between two day keys (b - a). */
export function daysBetweenKeys(a: string, b: string): number {
  const da = dayKeyToDate(a);
  const db = dayKeyToDate(b);
  // Use UTC arithmetic on local midnight values to ignore DST shifts.
  const utcA = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const utcB = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((utcB - utcA) / DAY_MS);
}

export function isSameDay(a: string | number | Date, b: string | number | Date): boolean {
  return dayKey(a) === dayKey(b);
}

export interface Duration {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function splitDuration(totalMs: number): Duration {
  const ms = Math.max(0, totalMs);
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);
  const seconds = Math.floor((ms % MINUTE_MS) / 1000);
  return { totalMs: ms, days, hours, minutes, seconds };
}

export function hourOf(value: string | number | Date): number {
  return toDate(value).getHours();
}

/** 0 = Sunday ... 6 = Saturday (local). */
export function weekdayOf(value: string | number | Date): number {
  return toDate(value).getDay();
}

/** Returns the list of day keys from `from` to `to` inclusive. */
export function dayKeysBetween(from: string, to: string): string[] {
  const keys: string[] = [];
  const count = daysBetweenKeys(from, to);
  if (count < 0) return keys;
  for (let i = 0; i <= count; i += 1) keys.push(addDaysToKey(from, i));
  return keys;
}

export function formatMinutesAsClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${pad(r)}`;
}
