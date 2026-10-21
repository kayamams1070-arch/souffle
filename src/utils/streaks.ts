/**
 * Streak, shield and freeze rules.
 *
 * - A streak day is a FULL local calendar day without any logged cigarette.
 * - The first countable day is the day after the quit day (the quit day itself is partial),
 *   unless the quit moment is exactly local midnight.
 * - A day with a cigarette breaks the streak unless a shield protected that day.
 * - Days inside a freeze are skipped: they neither count nor break.
 * - Today counts only once it is over, except that a cigarette today immediately
 *   brings the current streak to 0 (unless shielded).
 */
import type { RewardState, ShieldUse, SmokingEvent, StreakFreeze, StreakInfo, User } from '@/types';
import { addDaysToKey, DAY_MS, dayKey, dayKeyToDate, daysBetweenKeys } from './dates';
import { savingsStart } from './calculations';

export const SHIELD_COOLDOWN_DAYS = 7;
/** A shield can only protect today or yesterday (no arbitrary retroactive use). */
export const SHIELD_MAX_RETRO_DAYS = 1;
export const FREEZE_MAX_DAYS = 14;

export function firstCountableDay(user: User): string | null {
  if (user.goal !== 'quit' || !user.quitDate) return null;
  const quit = new Date(user.quitDate);
  const midnight = dayKeyToDate(dayKey(quit));
  if (quit.getTime() === midnight.getTime()) return dayKey(quit);
  return addDaysToKey(dayKey(quit), 1);
}

export function isDayFrozen(day: string, freezes: StreakFreeze[]): boolean {
  return freezes.some((f) => f.startDay <= day && day <= f.endDay);
}

export function isDayShielded(day: string, shieldUses: ShieldUse[]): boolean {
  return shieldUses.some((s) => s.protectedDay === day);
}

export function smokedOnDay(day: string, events: SmokingEvent[]): boolean {
  return events.some((e) => e.cigarettes > 0 && dayKey(e.occurredAt) === day);
}

/** Current streak in full days. */
export function computeCurrentStreak(
  user: User,
  events: SmokingEvent[],
  rewards: Pick<RewardState, 'shieldUses' | 'freezes'>,
  now = Date.now()
): number {
  const first = firstCountableDay(user);
  if (!first) return 0;
  const today = dayKey(now);
  // A cigarette today (unshielded, not frozen) resets the streak immediately.
  if (
    smokedOnDay(today, events) &&
    !isDayShielded(today, rewards.shieldUses) &&
    !isDayFrozen(today, rewards.freezes)
  ) {
    return 0;
  }
  let streak = 0;
  let day = addDaysToKey(today, -1);
  // Walk back from yesterday, at most ~20 years to avoid infinite loops on odd data.
  for (let guard = 0; guard < 7400; guard += 1) {
    if (day < first) break;
    if (isDayFrozen(day, rewards.freezes)) {
      day = addDaysToKey(day, -1);
      continue;
    }
    if (smokedOnDay(day, events) && !isDayShielded(day, rewards.shieldUses)) break;
    streak += 1;
    day = addDaysToKey(day, -1);
  }
  return streak;
}

export function shieldAvailability(
  shieldUses: ShieldUse[],
  now = Date.now()
): { available: boolean; nextAvailableAt?: string } {
  if (shieldUses.length === 0) return { available: true };
  const last = shieldUses.reduce((acc, s) => (s.usedAt > acc ? s.usedAt : acc), shieldUses[0]!.usedAt);
  const nextAt = new Date(last).getTime() + SHIELD_COOLDOWN_DAYS * DAY_MS;
  if (nextAt <= now) return { available: true };
  return { available: false, nextAvailableAt: new Date(nextAt).toISOString() };
}

/**
 * Whether a shield can be applied to protect `day` (the day of a relapse event).
 * Rules: shield available (weekly cooldown), day is today or yesterday, day not already shielded.
 */
export function canUseShield(
  rewards: Pick<RewardState, 'shieldUses'>,
  day: string,
  now = Date.now()
): { ok: boolean; reason?: 'cooldown' | 'too_old' | 'already' } {
  if (isDayShielded(day, rewards.shieldUses)) return { ok: false, reason: 'already' };
  if (!shieldAvailability(rewards.shieldUses, now).available) return { ok: false, reason: 'cooldown' };
  const today = dayKey(now);
  const diff = daysBetweenKeys(day, today);
  if (diff < 0 || diff > SHIELD_MAX_RETRO_DAYS) return { ok: false, reason: 'too_old' };
  return { ok: true };
}

export function activeFreeze(freezes: StreakFreeze[], now = Date.now()): StreakFreeze | undefined {
  const today = dayKey(now);
  return freezes.find((f) => f.startDay <= today && today <= f.endDay);
}

export function canStartFreeze(
  freezes: StreakFreeze[],
  startDay: string,
  days: number,
  now = Date.now()
): { ok: boolean; reason?: 'active' | 'too_long' | 'past' } {
  if (days < 1 || days > FREEZE_MAX_DAYS) return { ok: false, reason: 'too_long' };
  if (daysBetweenKeys(dayKey(now), startDay) < 0) return { ok: false, reason: 'past' };
  if (activeFreeze(freezes, now)) return { ok: false, reason: 'active' };
  const endDay = addDaysToKey(startDay, days - 1);
  const overlaps = freezes.some((f) => !(f.endDay < startDay || f.startDay > endDay));
  if (overlaps) return { ok: false, reason: 'active' };
  return { ok: true };
}

export function computeStreakInfo(
  user: User,
  events: SmokingEvent[],
  rewards: RewardState,
  now = Date.now()
): StreakInfo {
  const currentDays = computeCurrentStreak(user, events, rewards, now);
  const shield = shieldAvailability(rewards.shieldUses, now);
  const freeze = activeFreeze(rewards.freezes, now);
  return {
    currentDays,
    bestDays: Math.max(rewards.bestStreakDays, currentDays),
    shieldAvailable: shield.available,
    nextShieldAvailableAt: shield.nextAvailableAt,
    frozen: Boolean(freeze),
    freezeEndDay: freeze?.endDay,
  };
}

/** First full local day after an instant (the instant's own day if it is exactly midnight). */
export function firstFullDayAfter(iso: string): string {
  const d = new Date(iso);
  const midnight = dayKeyToDate(dayKey(d));
  return d.getTime() === midnight.getTime() ? dayKey(d) : addDaysToKey(dayKey(d), 1);
}

/**
 * Total complete smoke-free days (not only consecutive) since tracking started. Uses the
 * pinned savings start so a new quit date after a relapse never erases earlier days.
 * Only meaningful for the quit goal: in reduction mode a day without a logged cigarette
 * is not certain abstinence, so 0 is returned.
 */
export function totalSmokeFreeDays(user: User, events: SmokingEvent[], now = Date.now()): number {
  if (user.goal !== 'quit' || !user.quitDate) return 0;
  const first = firstFullDayAfter(savingsStart(user));
  const yesterday = addDaysToKey(dayKey(now), -1);
  const span = daysBetweenKeys(first, yesterday);
  if (span < 0) return 0;
  let count = 0;
  for (let i = 0; i <= span; i += 1) {
    const day = addDaysToKey(first, i);
    if (!smokedOnDay(day, events)) count += 1;
  }
  return count;
}
