import type { XpEventType } from '@/types';

export const APP_NAME = 'Souffle';
export const APP_VERSION = '1.0.0';
/**
 * Persisted schema version. History:
 * 1 - initial schema
 * 2 - user.savingsStartDate pinned (savings never reset by a new quit date / goal switch)
 */
export const SCHEMA_VERSION = 2;

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

/** Public health references used for the health timeline (checked October 2026). */
export const HEALTH_SOURCES: Record<string, { label: string; url: string }> = {
  who: {
    label: 'WHO, "Tobacco: Health benefits of smoking cessation"',
    url: 'https://www.who.int/news-room/q-a-detail/health-benefits-of-smoking-cessation',
  },
  nhs: {
    label: 'NHS Wales 111, "Quit smoking timeline"',
    url: 'https://111.wales.nhs.uk/livewell/quitsmokingtimeline/',
  },
};

/** Fagerström interpretation reference. */
export const FAGERSTROM_SOURCE = {
  label: 'NIDA Common Data Elements (NIH), FTND score interpretation, CDE 2195870',
  url: 'https://cde.nida.nih.gov/node/239',
};

/**
 * Free quit-smoking help lines (checked October 2026). Shown as complementary resources,
 * never as a sign of failure.
 */
export const HELP_RESOURCES = [
  { id: 'be', country: 'BE', name: 'Tabacstop / Tabakstop', phone: '0800 111 00', url: 'https://www.tabacstop.be' },
  { id: 'fr', country: 'FR', name: 'Tabac Info Service', phone: '39 89', url: 'https://www.tabac-info-service.fr' },
  { id: 'nl', country: 'NL', name: 'Ikstopnu (Stoplijn)', phone: '0800-1995', url: 'https://www.ikstopnu.nl' },
  { id: 'uk', country: 'UK', name: 'NHS Smokefree National Helpline', phone: '0300 123 1044', url: 'https://www.nhs.uk/better-health/quit-smoking/' },
] as const;
