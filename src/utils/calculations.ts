/**
 * Pure, centralized business calculations. These functions never touch storage or UI
 * and are covered by unit tests in src/__tests__/calculations.test.ts.
 */
import type { HabitsSnapshot, SmokingEvent, User } from '@/types';
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
  /** Cigarettes not smoked compared with the declared habits (estimate). */
  cigarettesAvoided: number;
  /** Estimated money not spent (theoretical, based on declared habits). */
  savedCents: number;
  /** Current theoretical daily spending at the declared habits. */
  perDayCents: number;
  projectionOneYearCents: number;
  projectionFiveYearsCents: number;
  projectionTenYearsCents: number;
  /** Money spent on cigarettes actually logged since the start of tracking. */
  spentSincePlanCents: number;
  /** ISO start of the savings period, or null when tracking has not started yet. */
  since: string | null;
}

/**
 * Start of savings tracking. `savingsStartDate` is fixed once and never moved by a
 * relapse; older profiles fall back to the quit date / reduction start / creation date.
 */
export function savingsStart(user: User): string {
  if (user.savingsStartDate) return user.savingsStartDate;
  if (user.goal === 'quit' && user.quitDate) return user.quitDate;
  return user.reductionStartDate ?? user.quitDate ?? user.createdAt;
}

/** Habits snapshots sorted ascending, always non-empty (falls back to the current profile). */
export function habitsTimeline(user: User): HabitsSnapshot[] {
  const current: HabitsSnapshot = {
    effectiveFrom: new Date(0).toISOString(),
    cigarettesPerDay: user.smokingBaselinePerDay,
    cigarettesPerPack: user.smoking.cigarettesPerPack,
    packPriceCents: user.smoking.packPriceCents,
  };
  const history = (user.habitsHistory ?? []).filter((h) => !Number.isNaN(new Date(h.effectiveFrom).getTime()));
  if (history.length === 0) return [current];
  return [...history].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1));
}

/** Habits that applied at instant `t` (the first snapshot also covers earlier instants). */
export function habitsAt(timeline: HabitsSnapshot[], t: number): HabitsSnapshot {
  let found = timeline[0]!;
  for (const h of timeline) {
    if (new Date(h.effectiveFrom).getTime() <= t) found = h;
    else break;
  }
  return found;
}

/**
 * Unified savings for both goals. Over [start, now], expected consumption is integrated
 * segment by segment with the habits valid at the time; cigarettes actually logged are
 * subtracted at the price valid when they were smoked. Changing the goal, choosing a new
 * quit date or relapsing never erases past savings.
 */
export function computeSavings(user: User, events: SmokingEvent[], now = Date.now()): SavingsSummary {
  const timeline = habitsTimeline(user);
  const currentHabits = habitsAt(timeline, now);
  const currentPerCig = pricePerCigaretteCents(currentHabits.packPriceCents, currentHabits.cigarettesPerPack);
  const perDayCents = currentHabits.cigarettesPerDay * currentPerCig;
  const dailyAvoidable =
    user.goal === 'reduce'
      ? Math.max(0, currentHabits.cigarettesPerDay - (user.reductionTargetPerDay ?? currentHabits.cigarettesPerDay)) * currentPerCig
      : perDayCents;
  const projection = (years: number) => Math.round(dailyAvoidable * 365.25 * years);
  const base = {
    perDayCents,
    projectionOneYearCents: projection(1),
    projectionFiveYearsCents: projection(5),
    projectionTenYearsCents: projection(10),
  };
  const startIso = savingsStart(user);
  const start = new Date(startIso).getTime();
  if (Number.isNaN(start) || start >= now) {
    return { ...base, cigarettesAvoided: 0, savedCents: 0, spentSincePlanCents: 0, since: null };
  }
  // Integrate expected consumption over habit segments.
  let expectedCigs = 0;
  let expectedCents = 0;
  const boundaries = timeline
    .map((h) => new Date(h.effectiveFrom).getTime())
    .filter((t) => t > start && t < now);
  const points = [start, ...boundaries, now];
  for (let i = 0; i < points.length - 1; i += 1) {
    const from = points[i]!;
    const to = points[i + 1]!;
    const h = habitsAt(timeline, from);
    const days = (to - from) / DAY_MS;
    const cigs = h.cigarettesPerDay * days;
    expectedCigs += cigs;
    expectedCents += cigs * pricePerCigaretteCents(h.packPriceCents, h.cigarettesPerPack);
  }
  let smoked = 0;
  let spent = 0;
  for (const e of events) {
    const t = new Date(e.occurredAt).getTime();
    if (t < start || t > now) continue;
    const h = habitsAt(timeline, t);
    smoked += e.cigarettes;
    spent += e.cigarettes * pricePerCigaretteCents(h.packPriceCents, h.cigarettesPerPack);
  }
  return {
    ...base,
    cigarettesAvoided: Math.max(0, Math.floor(expectedCigs - smoked)),
    savedCents: Math.max(0, Math.round(expectedCents - spent)),
    spentSincePlanCents: Math.round(spent),
    since: new Date(start).toISOString(),
  };
}

/** @deprecated kept for compatibility: use computeSavings. */
export function computeQuitSavings(user: User, events: SmokingEvent[], now = Date.now()): SavingsSummary {
  return computeSavings(user, events, now);
}

export interface ReductionSummary {
  todaySmoked: number;
  target: number;
  baseline: number;
  daysOnPlan: number;
  /** Days of the plan (today included) where logged consumption stayed at or under the target. */
  daysUnderTarget: number;
}

/**
 * Reduction goal: daily progress against the target since the plan started. Days without
 * any logged cigarette count as "under target" because the user is asked to log each one;
 * they are never presented as smoke-free days.
 */
export function computeReductionStats(user: User, events: SmokingEvent[], now = Date.now()): ReductionSummary {
  const baseline = user.smokingBaselinePerDay;
  const target = user.reductionTargetPerDay ?? baseline;
  const startIso = user.reductionStartDate ?? user.createdAt;
  const startDay = dayKey(startIso);
  const today = dayKey(now);
  const days = dayKeysBetween(startDay, today);
  let daysUnderTarget = 0;
  for (const day of days) {
    if (cigarettesSmokedOnDay(events, day) <= target) daysUnderTarget += 1;
  }
  return {
    todaySmoked: cigarettesSmokedOnDay(events, today),
    target,
    baseline,
    daysOnPlan: days.length,
    daysUnderTarget,
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
