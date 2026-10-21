import type { XpEventType } from '@/types';

export const APP_NAME = 'Souffle';
export const APP_VERSION = '1.0.0';
export const SCHEMA_VERSION = 1;

/** Centralized XP rules. Each event id is rewarded at most once (see rewardService). */
export const XP_RULES: Record<XpEventType, number> = {
  workout_completed: 30,
  craving_overcome: 15,
  journal_entry: 5,
  victory: 10,
  milestone: 50,
  breathing_test: 10,
  sos_completed: 10,
  relapse_recovery: 20,
};

/** Craving-journal timers (seconds). */
export const SOS_BREATHING_SECONDS = 120;
export const SOS_WORKOUT_SECONDS = 300;
export const CRAVING_SURF_SECONDS = 180;

/** Breathing pattern for the 2-minute guide (comfortable, no breath holding). */
export const BREATH_PATTERN = { inhaleSeconds: 4, exhaleSeconds: 6 };

/** Minimum observations before the craving forecast says anything. */
export const FORECAST_MIN_CRAVINGS = 8;

/** Level unlock rules for the training program. */
export const LEVEL_UNLOCK = {
  intermediate: { minWorkouts: 6, minDistinctWeeks: 2 },
  advanced: { minWorkouts: 18, minDistinctWeeks: 5 },
};

export const PROGRAM_WEEKS = 12;

export const STORAGE_PREFIX = 'souffle';

/** Public health references used for the health timeline. */
export const HEALTH_SOURCES: Record<string, { label: string; url: string }> = {
  who: {
    label: 'OMS / WHO, "Tobacco: health benefits of smoking cessation"',
    url: 'https://www.who.int/news-room/questions-and-answers/item/tobacco-health-benefits-of-smoking-cessation',
  },
  cdc: {
    label: 'CDC, "Benefits of Quitting Smoking"',
    url: 'https://www.cdc.gov/tobacco/about/benefits-of-quitting.html',
  },
  nhs: {
    label: 'NHS Better Health, "What happens when you quit smoking"',
    url: 'https://www.nhs.uk/better-health/quit-smoking/',
  },
  tis: {
    label: 'Tabac Info Service (Santé publique France)',
    url: 'https://www.tabac-info-service.fr/',
  },
};
