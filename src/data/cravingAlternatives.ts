import type { InterventionType, Trigger, WorkoutTheme } from '@/types';

export interface CravingAlternative {
  trigger: Trigger;
  /** i18n: alternatives.<trigger>.{title,text} */
  key: Trigger;
  /** Default SOS intervention suggested for this trigger. */
  intervention: InterventionType;
  /** Thematic workout proposed (if any). */
  theme?: WorkoutTheme;
  /** Whether the suggested action is physically intense (filtered for limitations). */
  intense: boolean;
}

export const CRAVING_ALTERNATIVES: Record<Trigger, CravingAlternative> = {
  coffee: { trigger: 'coffee', key: 'coffee', intervention: 'replacement_ritual', theme: 'coffee', intense: false },
  stress: { trigger: 'stress', key: 'stress', intervention: 'breathing', theme: 'stress', intense: false },
  boredom: { trigger: 'boredom', key: 'boredom', intervention: 'distraction', theme: 'boredom', intense: false },
  after_meal: { trigger: 'after_meal', key: 'after_meal', intervention: 'workout', theme: 'general', intense: false },
  alcohol: { trigger: 'alcohol', key: 'alcohol', intervention: 'craving_surf', intense: false },
  anger: { trigger: 'anger', key: 'anger', intervention: 'workout', theme: 'anger', intense: true },
  social: { trigger: 'social', key: 'social', intervention: 'replacement_ritual', intense: false },
  fatigue: { trigger: 'fatigue', key: 'fatigue', intervention: 'breathing', theme: 'fatigue', intense: false },
  night: { trigger: 'night', key: 'night', intervention: 'craving_surf', theme: 'calm', intense: false },
  to_sleep: { trigger: 'to_sleep', key: 'to_sleep', intervention: 'breathing', theme: 'calm', intense: false },
  screens: { trigger: 'screens', key: 'screens', intervention: 'workout', theme: 'boredom', intense: false },
  after_work: { trigger: 'after_work', key: 'after_work', intervention: 'workout', theme: 'general', intense: false },
  other: { trigger: 'other', key: 'other', intervention: 'breathing', intense: false },
};
