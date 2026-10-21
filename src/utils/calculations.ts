/**
 * Pure, centralized business calculations. These functions never touch storage or UI
 * and are covered by unit tests in src/__tests__/calculations.test.ts.
 */
import type { SmokingEvent, User } from '@/types';
import { DAY_MS, dayKey, dayKeysBetween, splitDuration, type Duration } from './dates';

export function pricePerCigaretteCents(packPriceCents: number, cigarettesPerPack: number): number {
  if (cigarettesPerPack <= 0) return 0;
  return packPriceCents / cigarettesPerPack;
}

/** Sum of cigarettes smoked in events within [from, to] (inclusive, ISO date-times). */
export function cigarettesSmokedBetween(
  events: SmokingEvent[],
  fromIso: string,
  toIso: string
): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return events.reduce((sum, e) => {
    const t = new Date(e.occurredAt).getTime();
    return t >= from && t <= to ? sum + e.cigarettes : sum;
  }, 0);
}

export function cigarettesSmokedOnDay(events: SmokingEvent[], day: string): number {
  return events.reduce((sum, e) => (dayKey(e.occurredAt) === day ? sum + e.cigarettes : sum), 0);
}

/**
 * The reference instant for the smoke-free counter: the quit date, or the most recent
 * smoking event after it. Returns null when the goal is reduction or the quit date is
 * not set yet.
 */
export function getSmokeFreeSince(user: User, events: SmokingEvent[]): string | null {
  if (user.goal !== 'quit' || !user.quitDate) return null;
  const quit = new Date(user.quitDate).getTime();
  let latest = quit;
  for (const e of events) {
    const t = new Date(e.occurredAt).getTime();
    if (t >= quit && t > latest && e.cigarettes > 0) latest = t;
  }
  return new Date(latest).toISOString();
}

export interface SmokeFreeState {
  /** 'future' when the quit date is later than now, 'running' otherwise, 'none' when unavailable. */
  status: 'future' | 'running' | 'none';
  since: string | null;
  duration: Duration;
  /** Time left before the quit date when status = future. */
  untilStart: Duration;
}

export function getSmokeFreeState(user: User, events: SmokingEvent[], now = Date.now()): SmokeFreeState {
  const since = getSmokeFreeSince(user, events);
  const empty = splitDuration(0);
  if (!since) return { status: 'none', since: null, duration: empty, untilStart: empty };
  const start = new Date(since).getTime();
  if (start > now) {
    return { status: 'future', since, duration: empty, untilStart: splitDuration(start - now) };
  }
  return { status: 'running', since, duration: splitDuration(now - start), untilStart: empty };
}

export interface SavingsSummary {
  cigarettesAvoided: number;
  savedCents: number;
  perDayCents: number;
  projectionOneYearCents: number;
  projectionFiveYearsCents: number;
  projectionTenYearsCents: number;
  /** Money actually spent on cigarettes logged since the start of the plan. */
  spentSincePlanCents: number;
}

/**
 * Savings for the "quit" goal: expected consumption since the quit date minus
 * cigarettes actually logged. Expected consumption grows continuously with time
 * (fractions of days count) so the number moves on the dashboard.
 */
export function computeQuitSavings(user: User, events: SmokingEvent[], now = Date.now()): SavingsSummary {
  const perCig = pricePerCigaretteCents(user.smoking.packPriceCents, user.smoking.cigarettesPerPack);
  const baseline = user.smokingBaselinePerDay;
  const perDayCents = baseline * perCig;
  const projection = (years: number) => Math.round(perDayCents * 365.25 * years);
  if (!user.quitDate) {
    return {
      cigarettesAvoided: 0,
      savedCents: 0,
      perDayCents,
      projectionOneYearCents: projection(1),
      projectionFiveYearsCents: projection(5),
      projectionTenYearsCents: projection(10),
      spentSincePlanCents: 0,
    };
  }
  const start = new Date(user.quitDate).getTime();
  const elapsedDays = Math.max(0, (now - start) / DAY_MS);
  const expected = baseline * elapsedDays;
  const smoked = cigarettesSmokedBetween(events, user.quitDate, new Date(now).toISOString());
  const avoided = Math.max(0, expected - smoked);
  return {
    cigarettesAvoided: Math.floor(avoided),
    savedCents: Math.max(0, Math.round(avoided * perCig)),
    perDayCents,
    projectionOneYearCents: projection(1),
    projectionFiveYearsCents: projection(5),
    projectionTenYearsCents: projection(10),
    spentSincePlanCents: Math.round(smoked * perCig),
  };
}

export interface ReductionSummary {
  todaySmoked: number;
  target: number;
  baseline: number;
  /** Cigarettes under the baseline accumulated over all full days of the plan + today. */
  cigarettesAvoided: number;
  savedCents: number;
  daysOnPlan: number;
  daysUnderTarget: number;
  perDayPotentialCents: number;
  projectionOneYearCents: number;
  projectionFiveYearsCents: number;
  projectionTenYearsCents: number;
}

/**
 * Reduction goal: for every day since the plan started, avoided = max(0, baseline - smoked).
 * Days with no logged cigarettes count as fully avoided only if the user has been logging
 * (we assume explicit logging; the UI reminds the user to log each cigarette).
 */
export function computeReductionStats(
  user: User,
  events: SmokingEvent[],
  now = Date.now()
): ReductionSummary {
  const perCig = pricePerCigaretteCents(user.smoking.packPriceCents, user.smoking.cigarettesPerPack);
  const baseline = user.smokingBaselinePerDay;
  const target = user.reductionTargetPerDay ?? baseline;
  const startIso = user.reductionStartDate ?? user.createdAt;
  const startDay = dayKey(startIso);
  const today = dayKey(now);
  const days = dayKeysBetween(startDay, today);
  let avoided = 0;
  let daysUnderTarget = 0;
  for (const day of days) {
    const smoked = cigarettesSmokedOnDay(events, day);
    avoided += Math.max(0, baseline - smoked);
    if (smoked <= target) daysUnderTarget += 1;
  }
  const todaySmoked = cigarettesSmokedOnDay(events, today);
  const dailyPotential = Math.max(0, baseline - target) * perCig;
  const projection = (years: number) => Math.round(dailyPotential * 365.25 * years);
  return {
    todaySmoked,
    target,
    baseline,
    cigarettesAvoided: avoided,
    savedCents: Math.round(avoided * perCig),
    daysOnPlan: days.length,
    daysUnderTarget,
    perDayPotentialCents: dailyPotential,
    projectionOneYearCents: projection(1),
    projectionFiveYearsCents: projection(5),
    projectionTenYearsCents: projection(10),
  };
}

/** Level is derived from XP with a gentle curve: level n needs 100 * n * (n - 1) / 2 XP. */
export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  return level;
}

export function xpForLevel(level: number): number {
  return (100 * level * (level - 1)) / 2;
}

export function levelProgress(xp: number): { level: number; current: number; needed: number } {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, current: xp - base, needed: next - base };
}
