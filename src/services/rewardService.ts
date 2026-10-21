/**
 * Badge evaluation and XP helpers. Badges are computed from facts (counts, days) and only
 * ever ADDED: the store never removes a badge, so a relapse keeps every acquired badge.
 */
import type { Craving, RewardState, SmokingEvent, User, WorkoutSession } from '@/types';
import { dayKey, daysBetweenKeys } from '@/utils/dates';
import { computeCurrentStreak } from '@/utils/streaks';
import { XP_RULES } from '@/utils/constants';

export interface RewardContext {
  user: User | null;
  cravings: Craving[];
  smokingEvents: SmokingEvent[];
  sessions: WorkoutSession[];
  rewards: RewardState;
  now?: number;
}

export function cravingsOvercome(cravings: Craving[]): number {
  return cravings.filter((c) => c.outcome === 'passed' || c.outcome === 'partly_passed').length;
}

export function completedWorkouts(sessions: WorkoutSession[]): number {
  return sessions.filter((s) => s.completed).length;
}

function weekKey(iso: string): string {
  const d = new Date(iso);
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dayKey(monday);
}

/** A "regular week" = 3 completed sessions within one Monday-based week. */
export function hasRegularWeek(sessions: WorkoutSession[]): boolean {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    if (!s.completed) continue;
    const k = weekKey(s.completedAt ?? s.startedAt);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.values()].some((n) => n >= 3);
}

/** A comeback = an action (workout or overcome craving) after a relapse event. */
export function hasComeback(smokingEvents: SmokingEvent[], sessions: WorkoutSession[], cravings: Craving[]): boolean {
  const lastRelapse = smokingEvents
    .filter((e) => e.decision && e.decision !== 'reduction_log')
    .map((e) => e.occurredAt)
    .sort()
    .at(-1);
  if (!lastRelapse) return false;
  const afterWorkout = sessions.some((s) => s.completed && (s.completedAt ?? s.startedAt) > lastRelapse);
  const afterCraving = cravings.some((c) => (c.outcome === 'passed' || c.outcome === 'partly_passed') && c.occurredAt > lastRelapse);
  return afterWorkout || afterCraving;
}

/** Returns the ids of every badge whose condition is currently met. */
export function evaluateBadges(ctx: RewardContext): string[] {
  const now = ctx.now ?? Date.now();
  const ids: string[] = [];
  if (ctx.user) {
    // Smoke-free badges use the best of current streak / total smoke-free days so that a
    // long-standing achievement is never lost after a relapse.
    const streak = computeCurrentStreak(ctx.user, ctx.smokingEvents, ctx.rewards, now);
    const days = Math.max(streak, ctx.rewards.bestStreakDays);
    if (days >= 1) ids.push('smoke_free_1d');
    if (days >= 7) ids.push('smoke_free_1w');
    if (days >= 30) ids.push('smoke_free_1m');
    if (days >= 90) ids.push('smoke_free_3m');
    if (days >= 365) ids.push('smoke_free_1y');
    if (ctx.user.personalPactSignedAt) ids.push('pact_signed');
  }
  const w = completedWorkouts(ctx.sessions);
  if (w >= 1) ids.push('workouts_1');
  if (w >= 10) ids.push('workouts_10');
  if (w >= 50) ids.push('workouts_50');
  if (w >= 100) ids.push('workouts_100');
  const c = cravingsOvercome(ctx.cravings);
  if (c >= 1) ids.push('cravings_1');
  if (c >= 10) ids.push('cravings_10');
  if (c >= 100) ids.push('cravings_100');
  if (hasRegularWeek(ctx.sessions)) ids.push('regular_week');
  if (hasComeback(ctx.smokingEvents, ctx.sessions, ctx.cravings)) ids.push('comeback');
  return ids;
}

/** Deterministic XP event ids so that the same fact is rewarded only once. */
export const xpEventId = {
  workout: (sessionId: string) => `workout:${sessionId}`,
  craving: (cravingId: string) => `craving:${cravingId}`,
  journal: (entryId: string) => `journal:${entryId}`,
  victory: (entryId: string) => `victory:${entryId}`,
  milestone: (milestoneId: string) => `milestone:${milestoneId}`,
  breathingTest: (testId: string) => `breathing_test:${testId}`,
  sos: (cravingId: string) => `sos:${cravingId}`,
  relapseRecovery: (eventId: string) => `relapse_recovery:${eventId}`,
};

export { XP_RULES };

/** Days since a given ISO date (whole local days). */
export function daysSince(iso: string, now = Date.now()): number {
  return daysBetweenKeys(dayKey(iso), dayKey(now));
}
