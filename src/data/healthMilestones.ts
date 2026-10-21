import type { HealthMilestone, Substance } from '@/types';

const H = 60;
const D = 24 * H;

/**
 * Indicative timeline. Wording (i18n: health.milestones.<key>) follows the public sources
 * listed in utils/constants HEALTH_SOURCES (WHO, NHS Wales). None of these benefits is
 * measured by the phone: they are population-level reference points that vary per person.
 */
export const TOBACCO_MILESTONES: HealthMilestone[] = [
  { id: 'm20min', afterMinutes: 20, key: 'm20min', category: 'cardio', substance: 'tobacco', variesByPerson: false, sourceIds: ['who', 'nhs'] },
  { id: 'm8h', afterMinutes: 8 * H, key: 'm8h', category: 'blood', substance: 'tobacco', variesByPerson: false, sourceIds: ['nhs'] },
  { id: 'm24h', afterMinutes: 24 * H, key: 'm24h', category: 'blood', substance: 'tobacco', variesByPerson: true, sourceIds: ['nhs', 'who'] },
  { id: 'm48h', afterMinutes: 48 * H, key: 'm48h', category: 'senses', substance: 'tobacco', variesByPerson: true, sourceIds: ['nhs'] },
  { id: 'm72h', afterMinutes: 72 * H, key: 'm72h', category: 'lungs', substance: 'tobacco', variesByPerson: true, sourceIds: ['nhs'] },
  { id: 'm2w', afterMinutes: 14 * D, key: 'm2w', category: 'cardio', substance: 'tobacco', variesByPerson: true, sourceIds: ['who', 'nhs'] },
  { id: 'm1m', afterMinutes: 30 * D, key: 'm1m', category: 'lungs', substance: 'tobacco', variesByPerson: true, sourceIds: ['who'] },
  { id: 'm3m', afterMinutes: 90 * D, key: 'm3m', category: 'lungs', substance: 'tobacco', variesByPerson: true, sourceIds: ['nhs', 'who'] },
  { id: 'm1y', afterMinutes: 365 * D, key: 'm1y', category: 'risk', substance: 'tobacco', variesByPerson: true, sourceIds: ['who', 'nhs'] },
];

/** @deprecated tobacco timeline, kept for compatibility: use milestonesFor(substance). */
export const HEALTH_MILESTONES = TOBACCO_MILESTONES;

/**
 * Cannabis timeline: what usually happens after stopping (withdrawal is common, temporary,
 * and eases with time). Sources in utils/constants CANNABIS_SOURCES. Indicative only.
 */
export const CANNABIS_MILESTONES: HealthMilestone[] = [
  // Withdrawal usually starts 1 to 3 days after the last use (Budney 2003, RCH guideline).
  { id: 'c1d', afterMinutes: 1 * D, key: 'c1d', category: 'withdrawal', substance: 'cannabis', variesByPerson: true, sourceIds: ['budney', 'rch'] },
  // Peak between day 2 and day 6.
  { id: 'c2d', afterMinutes: 2 * D, key: 'c2d', category: 'withdrawal', substance: 'cannabis', variesByPerson: true, sourceIds: ['budney', 'bonnet'] },
  { id: 'c1w', afterMinutes: 7 * D, key: 'c1w', category: 'withdrawal', substance: 'cannabis', variesByPerson: true, sourceIds: ['budney', 'bonnet'] },
  // Most effects last 4 to 14 days.
  { id: 'c2w', afterMinutes: 14 * D, key: 'c2w', category: 'withdrawal', substance: 'cannabis', variesByPerson: true, sourceIds: ['budney'] },
  // The syndrome usually lasts up to 3 weeks; sleep and dreams can take longer.
  { id: 'c3w', afterMinutes: 21 * D, key: 'c3w', category: 'sleep', substance: 'cannabis', variesByPerson: true, sourceIds: ['bonnet', 'rch', 'lee'] },
  { id: 'c1m', afterMinutes: 30 * D, key: 'c1m', category: 'mind', substance: 'cannabis', variesByPerson: true, sourceIds: ['jellinek', 'santefr'] },
  // Sleep disturbance may persist for months in some people (RCH).
  { id: 'c3m', afterMinutes: 90 * D, key: 'c3m', category: 'sleep', substance: 'cannabis', variesByPerson: true, sourceIds: ['rch', 'santefr'] },
];

/** Timeline for the person's substance; a mixed profile follows both, in time order. */
export function milestonesFor(substance: Substance = 'tobacco'): HealthMilestone[] {
  if (substance === 'tobacco') return TOBACCO_MILESTONES;
  if (substance === 'cannabis') return CANNABIS_MILESTONES;
  return [...TOBACCO_MILESTONES, ...CANNABIS_MILESTONES].sort((a, b) => a.afterMinutes - b.afterMinutes);
}

export function milestoneStatus(
  elapsedMinutes: number,
  substance: Substance = 'tobacco'
): {
  reached: HealthMilestone[];
  next: HealthMilestone | undefined;
  upcoming: HealthMilestone[];
} {
  const list = milestonesFor(substance);
  const reached = list.filter((m) => m.afterMinutes <= elapsedMinutes);
  const upcoming = list.filter((m) => m.afterMinutes > elapsedMinutes);
  return { reached, next: upcoming[0], upcoming };
}
