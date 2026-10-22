/**
 * Day-by-day cannabis withdrawal companion. Phases follow the published time course
 * (Budney et al. 2003; Bonnet & Preuss 2017; RCH Melbourne guideline): symptoms often start
 * within 1 to 3 days, peak between day 2 and day 6, mostly ease within 1 to 2 weeks and usually
 * end within about 3 weeks, while sleep and dreams can take longer. Indicative only: every
 * person is different and nothing here is measured by the phone.
 */
import type { Substance } from '@/types';

export type WithdrawalPhaseId = 'first_day' | 'peak' | 'easing' | 'fading' | 'sleep';

export interface WithdrawalPhase {
  id: WithdrawalPhaseId;
  /** 1-based day since the last use (day 1 = the first 24 hours). */
  day: number;
  /** Day (1-based) at which this phase starts and the first day of the next one. */
  fromDay: number;
  toDay: number;
}

const DAY_MIN = 24 * 60;

const PHASES: { id: WithdrawalPhaseId; fromDay: number; toDay: number }[] = [
  // Day 1: symptoms usually appear within 1 to 3 days.
  { id: 'first_day', fromDay: 1, toDay: 2 },
  // Days 2 to 6: the usual peak.
  { id: 'peak', fromDay: 2, toDay: 7 },
  // Days 7 to 14: most symptoms ease.
  { id: 'easing', fromDay: 7, toDay: 15 },
  // Days 15 to 21: the syndrome usually ends within about 3 weeks.
  { id: 'fading', fromDay: 15, toDay: 22 },
  // Days 22 to 30: sleep and dreams can take longer to settle.
  { id: 'sleep', fromDay: 22, toDay: 31 },
];

/** The companion covers the first 30 days after the last use. */
export const WITHDRAWAL_COMPANION_DAYS = 30;

/** Phase for a smoke-free duration, or null outside the first 30 days. */
export function withdrawalPhase(elapsedMinutes: number): WithdrawalPhase | null {
  if (!Number.isFinite(elapsedMinutes) || elapsedMinutes < 0) return null;
  const day = Math.floor(elapsedMinutes / DAY_MIN) + 1;
  if (day > WITHDRAWAL_COMPANION_DAYS) return null;
  const found = PHASES.find((p) => day >= p.fromDay && day < p.toDay) ?? PHASES[PHASES.length - 1]!;
  return { id: found.id, day, fromDay: found.fromDay, toDay: found.toDay };
}

/** The companion is offered to people who track cannabis (alone or with tobacco). */
export function showsWithdrawalCompanion(substance: Substance): boolean {
  return substance === 'cannabis' || substance === 'both';
}

export const WITHDRAWAL_PHASE_IDS: WithdrawalPhaseId[] = PHASES.map((p) => p.id);
