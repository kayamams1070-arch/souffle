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
export const CANNABIS_MILESTONES: HealthMilestone[] = [];

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
