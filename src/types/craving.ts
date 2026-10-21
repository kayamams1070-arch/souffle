export const TRIGGERS = [
  'coffee',
  'stress',
  'boredom',
  'after_meal',
  'alcohol',
  'anger',
  'social',
  'fatigue',
  'night',
  'other',
] as const;

export type Trigger = (typeof TRIGGERS)[number];

export const INTERVENTION_TYPES = [
  'breathing',
  'workout',
  'distraction',
  'craving_surf',
  'replacement_ritual',
  'none',
] as const;

export type InterventionType = (typeof INTERVENTION_TYPES)[number];

export type CravingOutcome = 'passed' | 'partly_passed' | 'persisted';

export type LocationType = 'home' | 'work' | 'outside' | 'social' | 'other';

export type Mood = 'calm' | 'tense' | 'sad' | 'tired' | 'irritated' | 'ok';

export interface Craving {
  id: string;
  occurredAt: string;
  /** 1 to 10 */
  intensity: number;
  trigger: Trigger;
  context?: string;
  locationType?: LocationType;
  mood?: Mood;
  interventionType?: InterventionType;
  interventionCompleted?: boolean;
  outcome?: CravingOutcome;
  durationSeconds?: number;
  smokedAfterward?: boolean;
}

/** A moment where cigarettes were actually smoked (relapse or reduction tracking). */
export type ConsumptionKind = 'cigarette' | 'joint';

export interface SmokingEvent {
  id: string;
  occurredAt: string;
  /** Consumption units (cigarettes, joints, or both for a mixed profile). */
  cigarettes: number;
  /** What was consumed; missing = the profile's main substance. */
  kind?: ConsumptionKind;
  trigger?: Trigger;
  context?: string;
  /** What the user decided right after. */
  decision?: 'continue_quit' | 'new_quit_date' | 'switch_to_reduce' | 'reduction_log';
  /** Whether the user used a streak shield for this event. */
  shieldUsed?: boolean;
}
