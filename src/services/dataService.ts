/**
 * Whole-app data operations: snapshot (export / backup), validated restore (import),
 * complete deletion, and the demo mode that never destroys a real user's data.
 *
 * Every function works on the Zustand stores (single source of truth in memory); the
 * persist middleware mirrors them to AsyncStorage through storageService.
 */
import { evaluateBadges } from './rewardService';
import { z } from 'zod';
import type { AppDataExport, RewardState, Settings, SportLevel, User } from '@/types';
import {
  resetAllStores,
  useCravingStore,
  useJournalStore,
  useRewardStore,
  useSettingsStore,
  useUserStore,
  useWorkoutStore,
} from '@/store';
import { APP_VERSION, SCHEMA_VERSION } from '@/utils/constants';
import {
  breathingTestSchema,
  challengeSchema,
  coughEntrySchema,
  cravingSchema,
  journalEntrySchema,
  sleepEntrySchema,
  smokingEventSchema,
  userSchema,
  workoutSessionSchema,
} from '@/utils/validation';
import { clearAll, readRaw, removeRaw, STORAGE_KEYS, writeRaw } from './storageService';
import { cancelAll } from './notificationService';
import { buildDemoData, DEMO_USER_ID } from '@/data/demoData';

export interface AppDataPayload {
  user: User | null;
  cravings: unknown[];
  smokingEvents: unknown[];
  sessions: unknown[];
  breathingTests: unknown[];
  activeLevel: SportLevel | null;
  rewards: RewardState;
  entries: unknown[];
  sleep: unknown[];
  cough: unknown[];
  challenges: unknown[];
  settings?: Partial<Settings>;
}

/** Reads every store and returns a versioned, self-describing snapshot. */
export function snapshotData(options: { includeSettings?: boolean } = {}): AppDataExport {
  const user = useUserStore.getState();
  const craving = useCravingStore.getState();
  const workout = useWorkoutStore.getState();
  const reward = useRewardStore.getState();
  const journal = useJournalStore.getState();
  const settings = useSettingsStore.getState().settings;
  const data: AppDataPayload = {
    user: user.user,
    cravings: craving.cravings,
    smokingEvents: craving.smokingEvents,
    sessions: workout.sessions,
    breathingTests: workout.breathingTests,
    activeLevel: workout.activeLevel,
    rewards: {
      xp: reward.xp,
      events: reward.events,
      badges: reward.badges,
      shieldUses: reward.shieldUses,
      freezes: reward.freezes,
      bestStreakDays: reward.bestStreakDays,
    },
    entries: journal.entries,
    sleep: journal.sleep,
    cough: journal.cough,
    challenges: journal.challenges,
    ...(options.includeSettings ? { settings } : {}),
  };
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    demoMode: settings.demoMode,
    data: data as unknown as Record<string, unknown>,
  };
}

export function serializeSnapshot(snapshot: AppDataExport): string {
  return JSON.stringify(snapshot, null, 2);
}

const rewardSchema = z.object({
  xp: z.number().min(0),
  events: z.array(z.object({ id: z.string(), type: z.string(), xp: z.number(), at: z.string() })),
  badges: z.array(z.object({ id: z.string(), unlockedAt: z.string() })),
  shieldUses: z.array(z.object({ id: z.string(), usedAt: z.string(), protectedDay: z.string() })),
  freezes: z.array(z.object({ id: z.string(), startDay: z.string(), endDay: z.string(), reason: z.enum(['illness', 'travel', 'other']) })),
  bestStreakDays: z.number().min(0),
});

const hour = z.number().int().min(0).max(23);
/** Settings coming from a file are validated field by field; unknown or invalid values are rejected. */
const settingsImportSchema = z
  .object({
    language: z.enum(['fr', 'nl', 'en']),
    languageChosen: z.boolean(),
    theme: z.enum(['system', 'light', 'dark']),
    fontScale: z.enum(['normal', 'large', 'xlarge']),
    highContrast: z.boolean(),
    reduceMotion: z.boolean(),
    hapticsEnabled: z.boolean(),
    soundEnabled: z.boolean(),
    voiceGuidanceEnabled: z.boolean(),
    cravingForecastEnabled: z.boolean(),
    notifications: z
      .object({
        enabled: z.boolean(),
        categories: z.record(z.enum(['workout_reminder', 'encouragement', 'trigger_preparation', 'weekly_summary', 'milestone', 'pact_reminder', 'journal_reminder']), z.boolean()),
        quietStartHour: hour,
        quietEndHour: hour,
        workoutReminderHour: hour,
        workoutReminderDays: z.array(z.number().int().min(0).max(6)),
        journalReminderHour: hour,
      })
      .partial(),
  })
  .partial();

const envelopeSchema = z.object({
  schemaVersion: z.number().int().min(1),
  exportedAt: z.string(),
  appVersion: z.string().optional(),
  demoMode: z.boolean().optional(),
  data: z.record(z.string(), z.unknown()),
});

export type ImportError = 'not_json' | 'not_souffle' | 'newer_version' | 'invalid_user';

export interface ImportResult {
  ok: boolean;
  error?: ImportError;
  /** Items dropped because they did not pass validation. */
  skipped: number;
  imported: { cravings: number; sessions: number; entries: number };
}

/** Keeps the items that validate and counts the others (never imports corrupt data). */
function validItems<T>(raw: unknown, schema: z.ZodType<T>): { items: T[]; skipped: number } {
  if (!Array.isArray(raw)) return { items: [], skipped: 0 };
  const items: T[] = [];
  let skipped = 0;
  for (const item of raw) {
    const parsed = schema.safeParse(item);
    if (parsed.success) items.push(parsed.data);
    else skipped += 1;
  }
  return { items, skipped };
}

/**
 * Validates a snapshot and replaces the in-memory stores. Nothing is changed when the
 * envelope or the user profile is invalid. Settings are only restored when present.
 */
export function applySnapshot(input: unknown): ImportResult {
  const empty = { cravings: 0, sessions: 0, entries: 0 };
  const envelope = envelopeSchema.safeParse(input);
  if (!envelope.success) return { ok: false, error: 'not_souffle', skipped: 0, imported: empty };
  if (envelope.data.schemaVersion > SCHEMA_VERSION) return { ok: false, error: 'newer_version', skipped: 0, imported: empty };
  const d = envelope.data.data;
  let user: User | null = null;
  if (d.user !== null && d.user !== undefined) {
    const parsedUser = userSchema.safeParse(d.user);
    if (!parsedUser.success) return { ok: false, error: 'invalid_user', skipped: 0, imported: empty };
    user = parsedUser.data as User;
  }
  const cravings = validItems(d.cravings, cravingSchema);
  const events = validItems(d.smokingEvents, smokingEventSchema);
  const sessions = validItems(d.sessions, workoutSessionSchema);
  const tests = validItems(d.breathingTests, breathingTestSchema);
  const entries = validItems(d.entries, journalEntrySchema);
  const sleep = validItems(d.sleep, sleepEntrySchema);
  const cough = validItems(d.cough, coughEntrySchema);
  const challenges = validItems(d.challenges, challengeSchema);
  const rewards = rewardSchema.safeParse(d.rewards);
  const level = d.activeLevel;

  useUserStore.getState().reset();
  if (user) useUserStore.getState().setUser(user);
  useCravingStore.getState().replaceAll({ cravings: cravings.items, smokingEvents: events.items });
  useWorkoutStore.getState().replaceAll({
    sessions: sessions.items,
    breathingTests: tests.items,
    activeLevel: level === 'beginner' || level === 'intermediate' || level === 'advanced' ? level : null,
  });
  useRewardStore
    .getState()
    .replaceAll(
      rewards.success
        ? (rewards.data as RewardState)
        : { xp: 0, events: [], badges: [], shieldUses: [], freezes: [], bestStreakDays: 0 }
    );
  useJournalStore.getState().replaceAll({ entries: entries.items, sleep: sleep.items, cough: cough.items, challenges: challenges.items });
  const settings = settingsImportSchema.safeParse(d.settings);
  if (d.settings !== undefined && settings.success) {
    const current = useSettingsStore.getState().settings;
    const { notifications, ...rest } = settings.data;
    useSettingsStore.getState().update({
      ...rest,
      // Never import demo mode: it is set only by enterDemo.
      demoMode: current.demoMode,
      notifications: notifications
        ? { ...current.notifications, ...notifications, categories: { ...current.notifications.categories, ...(notifications.categories ?? {}) } }
        : current.notifications,
    });
  }
  const rewardsSkipped = d.rewards !== undefined && !rewards.success ? 1 : 0;
  const skipped =
    cravings.skipped + events.skipped + sessions.skipped + tests.skipped + entries.skipped + sleep.skipped + cough.skipped + challenges.skipped + rewardsSkipped;
  return {
    ok: true,
    skipped,
    imported: { cravings: cravings.items.length, sessions: sessions.items.length, entries: entries.items.length },
  };
}

/** Parses a JSON string produced by `serializeSnapshot` and applies it. */
export function importFromJson(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not_json', skipped: 0, imported: { cravings: 0, sessions: 0, entries: 0 } };
  }
  return applySnapshot(parsed);
}

/**
 * Deletes every piece of data managed by the app: in-memory stores, persisted keys
 * (including a demo backup) and scheduled notifications. Called only after an explicit
 * confirmation in the privacy screen.
 */
export async function deleteAllData(): Promise<void> {
  await cancelAll();
  resetAllStores();
  // Let the persist middleware flush the empty states, then remove every key.
  await new Promise((resolve) => setTimeout(resolve, 50));
  await clearAll();
}

/** True when the current profile is the fictional demo profile. */
export function isDemoActive(): boolean {
  return useSettingsStore.getState().settings.demoMode || useUserStore.getState().user?.id === DEMO_USER_ID;
}

/**
 * Enters demo mode. If a real profile exists, its data is first copied to a dedicated
 * storage key so that leaving the demo restores it intact.
 */
export async function enterDemo(language: Settings['language'] = useSettingsStore.getState().settings.language): Promise<{ backedUp: boolean }> {
  let backedUp = false;
  const current = useUserStore.getState().user;
  // An existing backup (real profile) is never overwritten.
  if (current && !isDemoActive() && !(await hasDemoBackup())) {
    await writeRaw(STORAGE_KEYS.demoBackup, serializeSnapshot(snapshotData()));
    backedUp = true;
  }
  loadDemoIntoStores(language);
  return { backedUp };
}

/** Replaces the data stores with fresh fictional data (settings are kept). */
export function loadDemoIntoStores(language: Settings['language']): void {
  const data = buildDemoData(new Date(), language);
  useUserStore.getState().setUser(data.user);
  useUserStore.getState().clearDraft();
  useCravingStore.getState().replaceAll({ cravings: data.cravings, smokingEvents: data.smokingEvents });
  useWorkoutStore.getState().replaceAll({ sessions: data.sessions, breathingTests: data.breathingTests, activeLevel: 'beginner' });
  useRewardStore.getState().replaceAll({ xp: data.xp, events: data.xpEvents, badges: [], shieldUses: [], freezes: [], bestStreakDays: 12 });
  useJournalStore.getState().replaceAll({ entries: data.entries, sleep: data.sleep, cough: data.cough, challenges: data.challenges });
  // The demo profile arrives with its badges already earned: unlocking them here (rather than
  // in the app-wide sync) avoids a "9 new badges" celebration the moment the demo opens.
  const rewards = useRewardStore.getState();
  rewards.unlockBadges(
    evaluateBadges({ user: data.user, cravings: data.cravings, smokingEvents: data.smokingEvents, sessions: data.sessions, rewards })
  );
  useSettingsStore.getState().setDemoMode(true);
}

/** Whether a real profile was saved before entering demo mode. */
export async function hasDemoBackup(): Promise<boolean> {
  return (await readRaw(STORAGE_KEYS.demoBackup)) !== null;
}

/**
 * Leaves demo mode: restores the real profile saved by `enterDemo`, or returns to an
 * empty app (onboarding) when there was none. Settings (language, theme) are kept.
 */
export async function exitDemo(): Promise<{ restored: boolean }> {
  const raw = await readRaw(STORAGE_KEYS.demoBackup);
  useSettingsStore.getState().setDemoMode(false);
  if (raw) {
    const result = importFromJson(raw);
    if (result.ok) {
      await removeRaw(STORAGE_KEYS.demoBackup);
      return { restored: true };
    }
  }
  useUserStore.getState().reset();
  useCravingStore.getState().reset();
  useWorkoutStore.getState().reset();
  useRewardStore.getState().reset();
  useJournalStore.getState().reset();
  return { restored: false };
}
