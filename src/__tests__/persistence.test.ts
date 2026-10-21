import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useCravingStore,
  useRewardStore,
  useSettingsStore,
  useUserStore,
  useWorkoutStore,
} from '@/store';
import { STORAGE_KEYS } from '@/services/storageService';
import { migrateRewardState, migrateUserState } from '@/services/migrationService';
import { SCHEMA_VERSION } from '@/utils/constants';
import { local, makeUser } from './helpers';

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('persistence (survives closing and reopening the app)', () => {
  it('writes the profile to on-device storage with the schema version', async () => {
    useUserStore.getState().setUser(makeUser({ firstName: 'Nora' }));
    await flush();
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.user);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(SCHEMA_VERSION);
    expect(parsed.state.user.firstName).toBe('Nora');
  });

  it('restores every store from disk on launch (rehydration)', async () => {
    const user = makeUser({ firstName: 'Reload', savingsStartDate: local(2026, 3, 1, 8) });
    await AsyncStorage.setItem(
      STORAGE_KEYS.user,
      JSON.stringify({ state: { user, draft: {} }, version: SCHEMA_VERSION })
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.cravings,
      JSON.stringify({
        state: {
          cravings: [{ id: 'c1', occurredAt: local(2026, 3, 2), intensity: 7, trigger: 'stress' }],
          smokingEvents: [],
        },
        version: SCHEMA_VERSION,
      })
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.rewards,
      JSON.stringify({
        state: {
          xp: 45,
          events: [],
          badges: [{ id: 'cravings_1', unlockedAt: local(2026, 3, 2) }],
          shieldUses: [],
          freezes: [],
          bestStreakDays: 3,
        },
        version: SCHEMA_VERSION,
      })
    );
    await useUserStore.persist.rehydrate();
    await useCravingStore.persist.rehydrate();
    await useRewardStore.persist.rehydrate();
    expect(useUserStore.getState().user?.firstName).toBe('Reload');
    expect(useCravingStore.getState().cravings).toHaveLength(1);
    expect(useRewardStore.getState().xp).toBe(45);
    expect(useRewardStore.getState().badges[0]?.id).toBe('cravings_1');
  });

  it('migrates a v1 profile on launch (savings start pinned)', async () => {
    const v1User = makeUser({ firstName: 'Old', quitDate: local(2026, 2, 1, 9) });
    delete (v1User as Partial<typeof v1User>).savingsStartDate;
    await AsyncStorage.setItem(
      STORAGE_KEYS.user,
      JSON.stringify({ state: { user: v1User, draft: {} }, version: 1 })
    );
    await useUserStore.persist.rehydrate();
    expect(useUserStore.getState().user?.savingsStartDate).toBe(local(2026, 2, 1, 9));
  });

  it('repairs partial or corrupt slices instead of crashing', () => {
    expect(migrateRewardState({ xp: 'oops' }, 1)).toMatchObject({
      xp: 0,
      events: [],
      badges: [],
      bestStreakDays: 0,
    });
    expect(migrateUserState(null, 1)).toMatchObject({ user: null, draft: {} });
  });

  it('keeps new default settings when an older settings object is restored', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({
        state: { settings: { language: 'nl', theme: 'dark' } },
        version: SCHEMA_VERSION,
      })
    );
    await useSettingsStore.persist.rehydrate();
    const s = useSettingsStore.getState().settings;
    expect(s.language).toBe('nl');
    expect(s.theme).toBe('dark');
    expect(s.notifications.categories.workout_reminder).toBe(true);
    expect(s.hapticsEnabled).toBe(true);
  });
});

describe('workout sessions', () => {
  beforeEach(() => useWorkoutStore.getState().reset());

  it('starts and completes a session once (idempotent completion)', () => {
    const s = useWorkoutStore.getState().startSession('prog_beginner_w1_strength', 'beginner', 10);
    const done = useWorkoutStore
      .getState()
      .completeSession(s.id, { durationSeconds: 590, blocksCompleted: 10 });
    expect(done?.completed).toBe(true);
    const again = useWorkoutStore
      .getState()
      .completeSession(s.id, { durationSeconds: 9999, blocksCompleted: 1 });
    expect(again?.durationSeconds).toBe(590);
  });

  it('keeps an abandoned session in history without marking it complete', () => {
    const s = useWorkoutStore.getState().startSession('theme_stress', 'beginner', 6);
    useWorkoutStore.getState().abandonSession(s.id, { durationSeconds: 60, blocksCompleted: 1 });
    const stored = useWorkoutStore.getState().sessions.find((x) => x.id === s.id)!;
    expect(stored.completed).toBe(false);
    expect(stored.completedAt).toBeTruthy();
  });
});
