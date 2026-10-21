import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { RewardState, ShieldUse, StreakFreeze, UnlockedBadge, XpEvent, XpEventType } from '@/types';
import { STORAGE_KEYS, zustandStorage } from '@/services/storageService';
import { migrateRewardState } from '@/services/migrationService';
import { SCHEMA_VERSION, XP_RULES } from '@/utils/constants';
import { createId } from '@/utils/ids';
import { nowIso } from '@/utils/dates';

export interface RewardStoreState extends RewardState {
  hydrated: boolean;
  /**
   * Awards XP for an event id. Returns the XP granted (0 when the event was already rewarded).
   * The id must be deterministic for the underlying event (e.g. `workout:<sessionId>`).
   */
  awardXp: (eventId: string, type: XpEventType, xpOverride?: number) => number;
  /** Unlocks badges by id. Already unlocked badges are kept untouched. Returns newly unlocked ids. */
  unlockBadges: (ids: string[]) => string[];
  useShield: (protectedDay: string) => ShieldUse;
  addFreeze: (freeze: Omit<StreakFreeze, 'id'>) => StreakFreeze;
  cancelFreeze: (id: string) => void;
  recordBestStreak: (days: number) => void;
  replaceAll: (data: RewardState) => void;
  reset: () => void;
  _setHydrated: (value: boolean) => void;
}

export const useRewardStore = create<RewardStoreState>()(
  persist(
    (set, get) => ({
      xp: 0,
      events: [],
      badges: [],
      shieldUses: [],
      freezes: [],
      bestStreakDays: 0,
      hydrated: false,
      awardXp: (eventId, type, xpOverride) => {
        const state = get();
        if (state.events.some((e) => e.id === eventId)) return 0;
        const xp = xpOverride ?? XP_RULES[type];
        const event: XpEvent = { id: eventId, type, xp, at: nowIso() };
        set({ xp: state.xp + xp, events: [...state.events, event] });
        return xp;
      },
      unlockBadges: (ids) => {
        const state = get();
        const existing = new Set(state.badges.map((b) => b.id));
        const fresh = ids.filter((id) => !existing.has(id));
        if (fresh.length === 0) return [];
        const at = nowIso();
        const added: UnlockedBadge[] = fresh.map((id) => ({ id, unlockedAt: at }));
        set({ badges: [...state.badges, ...added] });
        return fresh;
      },
      useShield: (protectedDay) => {
        const use: ShieldUse = { id: createId('shield'), usedAt: nowIso(), protectedDay };
        set({ shieldUses: [...get().shieldUses, use] });
        return use;
      },
      addFreeze: (input) => {
        const freeze: StreakFreeze = { ...input, id: createId('frz') };
        set({ freezes: [...get().freezes, freeze] });
        return freeze;
      },
      cancelFreeze: (id) => set({ freezes: get().freezes.filter((f) => f.id !== id) }),
      recordBestStreak: (days) => {
        if (days > get().bestStreakDays) set({ bestStreakDays: days });
      },
      replaceAll: (data) =>
        set({
          xp: data.xp,
          events: data.events,
          badges: data.badges,
          shieldUses: data.shieldUses,
          freezes: data.freezes,
          bestStreakDays: data.bestStreakDays,
        }),
      reset: () =>
        set({ xp: 0, events: [], badges: [], shieldUses: [], freezes: [], bestStreakDays: 0 }),
      _setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: STORAGE_KEYS.rewards,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        xp: s.xp,
        events: s.events,
        badges: s.badges,
        shieldUses: s.shieldUses,
        freezes: s.freezes,
        bestStreakDays: s.bestStreakDays,
      }),
      migrate: (persisted, version) => migrateRewardState(persisted, version),
      onRehydrateStorage: () => (state) => state?._setHydrated(true),
    }
  )
);
