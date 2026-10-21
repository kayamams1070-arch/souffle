import type { BadgeDefinition } from '@/types';

export const BADGES: BadgeDefinition[] = [
  { id: 'smoke_free_1d', key: 'smoke_free_1d', icon: 'sunny-outline', category: 'smoke_free' },
  { id: 'smoke_free_1w', key: 'smoke_free_1w', icon: 'calendar-outline', category: 'smoke_free' },
  { id: 'smoke_free_1m', key: 'smoke_free_1m', icon: 'moon-outline', category: 'smoke_free' },
  { id: 'smoke_free_3m', key: 'smoke_free_3m', icon: 'flower-outline', category: 'smoke_free' },
  { id: 'smoke_free_1y', key: 'smoke_free_1y', icon: 'trophy-outline', category: 'smoke_free' },
  { id: 'workouts_1', key: 'workouts_1', icon: 'walk-outline', category: 'sport' },
  { id: 'workouts_10', key: 'workouts_10', icon: 'fitness-outline', category: 'sport' },
  { id: 'workouts_50', key: 'workouts_50', icon: 'barbell-outline', category: 'sport' },
  { id: 'workouts_100', key: 'workouts_100', icon: 'medal-outline', category: 'sport' },
  { id: 'cravings_1', key: 'cravings_1', icon: 'hand-left-outline', category: 'craving' },
  { id: 'cravings_10', key: 'cravings_10', icon: 'shield-checkmark-outline', category: 'craving' },
  { id: 'cravings_100', key: 'cravings_100', icon: 'diamond-outline', category: 'craving' },
  { id: 'regular_week', key: 'regular_week', icon: 'repeat-outline', category: 'consistency' },
  { id: 'comeback', key: 'comeback', icon: 'refresh-outline', category: 'consistency' },
  { id: 'pact_signed', key: 'pact_signed', icon: 'create-outline', category: 'consistency' },
];

const BY_ID = new Map(BADGES.map((b) => [b.id, b]));

export function getBadge(id: string): BadgeDefinition | undefined {
  return BY_ID.get(id);
}
