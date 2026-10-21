import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useCravingStore,
  useJournalStore,
  useRewardStore,
  useSettingsStore,
  useUserStore,
  useWorkoutStore,
} from '@/store';
import {
  applySnapshot,
  deleteAllData,
  enterDemo,
  exitDemo,
  hasDemoBackup,
  importFromJson,
  serializeSnapshot,
  snapshotData,
} from '@/services/dataService';
import { STORAGE_KEYS } from '@/services/storageService';
import { DEMO_USER_ID, buildDemoData } from '@/data/demoData';
import { computeSavings } from '@/utils/calculations';
import { computeCurrentStreak } from '@/utils/streaks';
import { xpEventId } from '@/services/rewardService';
import { SCHEMA_VERSION } from '@/utils/constants';
import { craving, local, makeUser, ms, session } from './helpers';

const flush = () => new Promise((r) => setTimeout(r, 20));

function seedRealUser() {
  useUserStore
    .getState()
    .setUser(
      makeUser({ id: 'usr_real', firstName: 'Réel', savingsStartDate: local(2026, 3, 1, 8) })
    );
  useCravingStore.getState().replaceAll({
    cravings: [craving(local(2026, 3, 2, 9), { outcome: 'passed' })],
    smokingEvents: [],
  });
  useWorkoutStore
    .getState()
    .replaceAll({ sessions: [session(local(2026, 3, 3, 18))], breathingTests: [] });
  useRewardStore.getState().replaceAll({
    xp: 45,
    events: [],
    badges: [{ id: 'workouts_1', unlockedAt: local(2026, 3, 3, 18) }],
    shieldUses: [],
    freezes: [],
    bestStreakDays: 2,
  });
  useJournalStore.getState().replaceAll({
    entries: [{ id: 'j1', date: local(2026, 3, 3, 21), type: 'good_day', text: 'Bonne journée' }],
    sleep: [],
    cough: [],
    challenges: [],
  });
  useSettingsStore.getState().setDemoMode(false);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  seedRealUser();
});

describe('export / import', () => {
  it('round-trips every store through JSON', () => {
    const json = serializeSnapshot(snapshotData({ includeSettings: true }));
    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    useCravingStore.getState().reset();
    useRewardStore.getState().reset();
    const result = importFromJson(json);
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(0);
    expect(useUserStore.getState().user?.firstName).toBe('Réel');
    expect(useCravingStore.getState().cravings).toHaveLength(1);
    expect(useRewardStore.getState().xp).toBe(45);
    expect(useJournalStore.getState().entries[0]?.text).toBe('Bonne journée');
  });

  it('rejects non-JSON, foreign files and newer schema versions without touching data', () => {
    expect(importFromJson('not json').error).toBe('not_json');
    expect(importFromJson('{"hello":1}').error).toBe('not_souffle');
    expect(
      applySnapshot({ schemaVersion: SCHEMA_VERSION + 1, exportedAt: 'x', data: {} }).error
    ).toBe('newer_version');
    expect(
      applySnapshot({ schemaVersion: 1, exportedAt: 'x', data: { user: { id: 1 } } }).error
    ).toBe('invalid_user');
    expect(useUserStore.getState().user?.firstName).toBe('Réel');
  });

  it('drops invalid items and reports how many were skipped', () => {
    const snap = snapshotData();
    (snap.data as { cravings: unknown[] }).cravings.push({ id: 'bad', intensity: 99 });
    const result = applySnapshot(snap);
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(1);
    expect(useCravingStore.getState().cravings).toHaveLength(1);
  });
});

describe('delete all data', () => {
  it('erases every key and resets the app to the first launch state', async () => {
    await flush();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.user)).not.toBeNull();
    await deleteAllData();
    await flush();
    expect(useUserStore.getState().user).toBeNull();
    expect(useCravingStore.getState().cravings).toHaveLength(0);
    expect(useRewardStore.getState().xp).toBe(0);
    const keys = await AsyncStorage.getAllKeys();
    for (const k of keys) {
      const raw = await AsyncStorage.getItem(k);
      // Any key re-written by the persist middleware after deletion holds empty defaults only.
      expect(raw ?? '').not.toContain('Réel');
      expect(raw ?? '').not.toContain('Bonne journée');
    }
  });
});

describe('demo mode never destroys a real profile', () => {
  it('backs up the real data, shows clearly flagged demo data, and restores on exit', async () => {
    const entered = await enterDemo('fr');
    expect(entered.backedUp).toBe(true);
    expect(await hasDemoBackup()).toBe(true);
    expect(useSettingsStore.getState().settings.demoMode).toBe(true);
    expect(useUserStore.getState().user?.id).toBe(DEMO_USER_ID);
    expect(useCravingStore.getState().cravings.length).toBeGreaterThan(10);

    const exited = await exitDemo();
    expect(exited.restored).toBe(true);
    expect(useSettingsStore.getState().settings.demoMode).toBe(false);
    expect(useUserStore.getState().user?.firstName).toBe('Réel');
    expect(useRewardStore.getState().xp).toBe(45);
    expect(await hasDemoBackup()).toBe(false);
  });

  it('does not overwrite the backup when the demo is reloaded', async () => {
    await enterDemo('fr');
    const second = await enterDemo('fr');
    expect(second.backedUp).toBe(false);
    await exitDemo();
    expect(useUserStore.getState().user?.firstName).toBe('Réel');
  });

  it('returns to an empty app when the demo was started without a profile', async () => {
    useUserStore.getState().reset();
    await enterDemo('en');
    expect((await exitDemo()).restored).toBe(false);
    expect(useUserStore.getState().user).toBeNull();
  });

  it('builds coherent fictional data in each language', () => {
    for (const lang of ['fr', 'nl', 'en'] as const) {
      const d = buildDemoData(new Date(2026, 3, 20, 12), lang);
      expect(d.user.id).toBe(DEMO_USER_ID);
      expect(d.xp).toBe(d.xpEvents.reduce((s, e) => s + e.xp, 0));
      expect(new Set(d.xpEvents.map((e) => e.id)).size).toBe(d.xpEvents.length);
      expect(d.entries.every((e) => e.text.length > 0)).toBe(true);
    }
  });
});

describe('relapse keeps every achievement', () => {
  it('a new quit date after a cigarette keeps XP, badges, sessions, savings history and the best record', () => {
    const quit = local(2026, 3, 1, 8);
    useUserStore.getState().setUser(makeUser({ quitDate: quit, savingsStartDate: undefined }));
    useRewardStore.getState().replaceAll({
      xp: 300,
      events: [],
      badges: [{ id: 'smoke_free_1w', unlockedAt: local(2026, 3, 8) }],
      shieldUses: [],
      freezes: [],
      bestStreakDays: 9,
    });
    const before = computeSavings(useUserStore.getState().user!, [], ms(local(2026, 3, 11, 8)));
    const relapseAt = local(2026, 3, 11, 8);
    const ev = useCravingStore
      .getState()
      .addSmokingEvent({ occurredAt: relapseAt, cigarettes: 1, decision: 'new_quit_date' });
    useUserStore.getState().setQuitDate(relapseAt);
    useRewardStore.getState().awardXp(xpEventId.relapseRecovery(ev.id), 'relapse_recovery');
    const user = useUserStore.getState().user!;
    expect(user.quitDate).toBe(relapseAt);
    expect(user.savingsStartDate).toBe(quit);
    const after = computeSavings(
      user,
      useCravingStore.getState().smokingEvents,
      ms(local(2026, 3, 11, 9))
    );
    expect(after.savedCents).toBeGreaterThanOrEqual(before.savedCents - 50);
    expect(useRewardStore.getState().xp).toBe(320);
    expect(useRewardStore.getState().badges).toHaveLength(1);
    expect(useRewardStore.getState().bestStreakDays).toBe(9);
    expect(useWorkoutStore.getState().sessions).toHaveLength(1);
    expect(
      computeCurrentStreak(
        user,
        useCravingStore.getState().smokingEvents,
        useRewardStore.getState(),
        ms(local(2026, 3, 11, 9))
      )
    ).toBe(0);
  });

  it('switching to reduction keeps the savings start', () => {
    const quit = local(2026, 3, 1, 8);
    useUserStore.getState().setUser(makeUser({ quitDate: quit, savingsStartDate: undefined }));
    useUserStore.getState().switchGoal('reduce');
    const u = useUserStore.getState().user!;
    expect(u.goal).toBe('reduce');
    expect(u.savingsStartDate).toBe(quit);
    expect(u.reductionTargetPerDay).toBe(15);
  });

  it('correcting the quit date earlier moves the savings start earlier, never later', () => {
    const quit = local(2026, 3, 10, 8);
    useUserStore.getState().setUser(makeUser({ quitDate: quit, savingsStartDate: quit }));
    useUserStore.getState().setQuitDate(local(2026, 3, 5, 8), { correction: true });
    expect(useUserStore.getState().user?.savingsStartDate).toBe(local(2026, 3, 5, 8));
    useUserStore.getState().setQuitDate(local(2026, 3, 12, 8), { correction: true });
    expect(useUserStore.getState().user?.savingsStartDate).toBe(local(2026, 3, 5, 8));
  });

  it('editing habits records a dated snapshot', () => {
    useUserStore.getState().setUser(makeUser());
    useUserStore
      .getState()
      .updateHabits({ cigarettesPerDay: 25, cigarettesPerPack: 20, packPriceCents: 1100 });
    const u = useUserStore.getState().user!;
    expect(u.habitsHistory).toHaveLength(2);
    expect(u.habitsHistory![0]!.packPriceCents).toBe(1000);
    expect(u.habitsHistory![1]!.packPriceCents).toBe(1100);
    expect(u.smokingBaselinePerDay).toBe(25);
    useUserStore
      .getState()
      .updateHabits({ cigarettesPerDay: 25, cigarettesPerPack: 20, packPriceCents: 1100 });
    expect(useUserStore.getState().user!.habitsHistory).toHaveLength(2);
  });
});
