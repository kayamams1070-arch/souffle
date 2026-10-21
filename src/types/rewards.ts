export type BadgeCategory = 'smoke_free' | 'sport' | 'craving' | 'consistency';

export interface BadgeDefinition {
  id: string;
  /** Translation key prefix: badges.<id>.title / .description */
  key: string;
  icon: string;
  category: BadgeCategory;
}

export interface UnlockedBadge {
  id: string;
  unlockedAt: string;
}

export type XpEventType =
  | 'workout_completed'
  | 'craving_overcome'
  | 'journal_entry'
  | 'victory'
  | 'milestone'
  | 'breathing_test'
  | 'sos_completed'
  | 'relapse_recovery';

export interface XpEvent {
  /** Unique, deterministic id of the rewarded event (idempotence key). */
  id: string;
  type: XpEventType;
  xp: number;
  at: string;
}

export interface ShieldUse {
  id: string;
  usedAt: string;
  /** Local day (YYYY-MM-DD) that the shield protected. */
  protectedDay: string;
}

export interface StreakFreeze {
  id: string;
  startDay: string;
  endDay: string;
  reason: 'illness' | 'travel' | 'other';
}

export interface RewardState {
  xp: number;
  events: XpEvent[];
  badges: UnlockedBadge[];
  shieldUses: ShieldUse[];
  freezes: StreakFreeze[];
  bestStreakDays: number;
}

export interface StreakInfo {
  currentDays: number;
  bestDays: number;
  shieldAvailable: boolean;
  nextShieldAvailableAt?: string;
  frozen: boolean;
  freezeEndDay?: string;
}
