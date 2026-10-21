import type { HealthMilestone } from '@/types';

const H = 60;
const D = 24 * H;

/**
 * Indicative timeline. Wording (i18n: health.milestones.<key>) follows the public
 * sources listed in utils/constants HEALTH_SOURCES (WHO, CDC, NHS, Tabac Info Service).
 * None of these benefits is measured by the phone: they are population-level reference points.
 */
export const HEALTH_MILESTONES: HealthMilestone[] = [
  { id: 'm20min', afterMinutes: 20, key: 'm20min', category: 'cardio', variesByPerson: false, sourceIds: ['who', 'cdc'] },
  { id: 'm8h', afterMinutes: 8 * H, key: 'm8h', category: 'blood', variesByPerson: false, sourceIds: ['nhs', 'tis'] },
  { id: 'm24h', afterMinutes: 24 * H, key: 'm24h', category: 'blood', variesByPerson: true, sourceIds: ['tis', 'nhs'] },
  { id: 'm48h', afterMinutes: 48 * H, key: 'm48h', category: 'senses', variesByPerson: true, sourceIds: ['nhs', 'tis'] },
  { id: 'm72h', afterMinutes: 72 * H, key: 'm72h', category: 'lungs', variesByPerson: true, sourceIds: ['nhs', 'tis'] },
  { id: 'm2w', afterMinutes: 14 * D, key: 'm2w', category: 'cardio', variesByPerson: true, sourceIds: ['who', 'nhs'] },
  { id: 'm1m', afterMinutes: 30 * D, key: 'm1m', category: 'lungs', variesByPerson: true, sourceIds: ['who', 'nhs'] },
  { id: 'm3m', afterMinutes: 90 * D, key: 'm3m', category: 'lungs', variesByPerson: true, sourceIds: ['who', 'nhs'] },
  { id: 'm1y', afterMinutes: 365 * D, key: 'm1y', category: 'risk', variesByPerson: true, sourceIds: ['who', 'cdc'] },
];

export function milestoneStatus(elapsedMinutes: number): {
  reached: HealthMilestone[];
  next: HealthMilestone | undefined;
  upcoming: HealthMilestone[];
} {
  const reached = HEALTH_MILESTONES.filter((m) => m.afterMinutes <= elapsedMinutes);
  const upcoming = HEALTH_MILESTONES.filter((m) => m.afterMinutes > elapsedMinutes);
  return { reached, next: upcoming[0], upcoming };
}
