/** Regression tests for the issues found by the independent review. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_NOTIFICATIONS, useRewardStore, useSettingsStore, useUserStore } from '@/store';
import { canStartFreeze, FREEZE_COOLDOWN_DAYS } from '@/utils/streaks';
import { moveOutOfQuietHours } from '@/services/notificationService';
import { applySnapshot, enterDemo, exitDemo, snapshotData } from '@/services/dataService';
import { readRaw, STORAGE_KEYS } from '@/services/storageService';
import { detectIntent } from '@/services/coachService';
import { local, makeUser, ms, smoke } from './helpers';

beforeEach(async () => {
  await AsyncStorage.clear();
  useRewardStore.getState().reset();
  useSettingsStore.getState().reset();
});

describe('quit date changes and savings start', () => {
  it('postponing the quit date to the future restarts savings at the new date', () => {
    const start = new Date(Date.now() - 60_000).toISOString();
    useUserStore.getState().setUser(makeUser({ quitDate: start, savingsStartDate: start }));
    const later = new Date(Date.now() + 7 * 86_400_000).toISOString();
    useUserStore.getState().setQuitDate(later, { correction: true });
    expect(useUserStore.getState().user?.savingsStartDate).toBe(later);
  });

  it('a new quit date after a relapse that happened before a future quit date starts savings now', () => {
    const future = new Date(Date.now() + 3 * 86_400_000).toISOString();
    useUserStore.getState().setUser(makeUser({ quitDate: future, savingsStartDate: future }));
    const now = new Date().toISOString();
    useUserStore.getState().setQuitDate(now);
    expect(useUserStore.getState().user?.savingsStartDate).toBe(now);
  });
});

describe('freeze cannot bypass the shield', () => {
  const now = ms(local(2026, 4, 10, 12));
  it('refuses a freeze starting on a day with a logged cigarette', () => {
    expect(canStartFreeze([], '2026-04-10', 1, now, [smoke(local(2026, 4, 10, 9))])).toEqual({
      ok: false,
      reason: 'smoked',
    });
  });
  it('allows one freeze per 30 days', () => {
    const past = [
      { id: 'f', startDay: '2026-03-25', endDay: '2026-03-26', reason: 'travel' as const },
    ];
    expect(canStartFreeze(past, '2026-04-10', 2, now).reason).toBe('cooldown');
    expect(FREEZE_COOLDOWN_DAYS).toBe(30);
  });
  it('ending a freeze early keeps the days already frozen', () => {
    useRewardStore
      .getState()
      .addFreeze({ startDay: '2026-04-05', endDay: '2026-04-12', reason: 'illness' });
    const id = useRewardStore.getState().freezes[0]!.id;
    useRewardStore.getState().endFreeze(id, '2026-04-08');
    expect(useRewardStore.getState().freezes[0]).toMatchObject({
      startDay: '2026-04-05',
      endDay: '2026-04-07',
    });
  });
});

describe('quiet hours for milestone notifications', () => {
  it('moves a 03:00 milestone to the end of the quiet window', () => {
    const moved = moveOutOfQuietHours(new Date(2026, 3, 10, 3, 0), DEFAULT_NOTIFICATIONS);
    expect(moved.getHours()).toBe(8);
    expect(moved.getDate()).toBe(10);
  });
  it('moves a 23:00 milestone to the next morning', () => {
    const moved = moveOutOfQuietHours(new Date(2026, 3, 10, 23, 0), DEFAULT_NOTIFICATIONS);
    expect(moved.getDate()).toBe(11);
    expect(moved.getHours()).toBe(8);
  });
  it('keeps allowed hours', () => {
    const at = new Date(2026, 3, 10, 15, 20);
    expect(moveOutOfQuietHours(at, DEFAULT_NOTIFICATIONS)).toBe(at);
  });
});

describe('importing settings', () => {
  it('ignores invalid settings instead of crashing later', () => {
    useUserStore.getState().setUser(makeUser());
    const snap = snapshotData({ includeSettings: true });
    (snap.data as Record<string, unknown>).settings = { notifications: null, language: 'xx' };
    expect(applySnapshot(snap).ok).toBe(true);
    const s = useSettingsStore.getState().settings;
    expect(s.notifications).toBeTruthy();
    expect(s.notifications.categories.workout_reminder).toBe(true);
    expect(['fr', 'nl', 'en']).toContain(s.language);
  });
  it('merges valid partial notification settings and never imports demo mode', () => {
    useUserStore.getState().setUser(makeUser());
    const snap = snapshotData();
    (snap.data as Record<string, unknown>).settings = {
      theme: 'dark',
      demoMode: true,
      notifications: { quietStartHour: 21 },
    };
    applySnapshot(snap);
    const s = useSettingsStore.getState().settings;
    expect(s.theme).toBe('dark');
    expect(s.demoMode).toBe(false);
    expect(s.notifications.quietStartHour).toBe(21);
    expect(s.notifications.quietEndHour).toBe(8);
  });
});

describe('demo backup is never overwritten', () => {
  it('keeps the first real backup even if a backup already exists', async () => {
    useUserStore.getState().setUser(makeUser({ id: 'usr_real', firstName: 'Vrai' }));
    await enterDemo('fr');
    useSettingsStore.getState().setDemoMode(false); // simulate a failed exit that left the flag off
    await enterDemo('fr');
    const raw = await readRaw(STORAGE_KEYS.demoBackup);
    expect(raw).toContain('Vrai');
    await exitDemo();
    expect(useUserStore.getState().user?.firstName).toBe('Vrai');
  });
});

describe('coach safety keywords', () => {
  it('does not treat French "pain" (bread) as physical pain', () => {
    expect(detectIntent("J'ai envie d'un pain au chocolat")).not.toBe('pain');
    expect(detectIntent("I'm in pain")).toBe('pain');
    expect(detectIntent('It hurts')).toBe('pain');
  });
});
