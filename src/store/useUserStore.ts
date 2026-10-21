import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { HabitsSnapshot, OnboardingDraft, User } from '@/types';
import { STORAGE_KEYS, zustandStorage } from '@/services/storageService';
import { migrateUserState } from '@/services/migrationService';
import { SCHEMA_VERSION } from '@/utils/constants';
import { nowIso } from '@/utils/dates';
import { habitsTimeline, savingsStart } from '@/utils/calculations';

/** Savings start pinned on the profile so later goal / date changes never move it forward. */
function pinnedSavingsStart(user: User): string {
  return user.savingsStartDate ?? savingsStart(user);
}

export interface UserState {
  user: User | null;
  draft: OnboardingDraft;
  hydrated: boolean;
  setUser: (user: User) => void;
  updateUser: (patch: Partial<User>) => void;
  updateDraft: (patch: OnboardingDraft) => void;
  clearDraft: () => void;
  signPact: (signature: string) => void;
  /**
   * Sets the quit moment. `correction: true` means the user fixes the date of the same
   * attempt (goal settings): savings may then start earlier. A restart after a relapse
   * keeps the existing savings start.
   */
  setQuitDate: (quitDateIso: string, options?: { correction?: boolean }) => void;
  /** Updates declared habits and records a dated snapshot so past savings stay unchanged. */
  updateHabits: (habits: Omit<HabitsSnapshot, 'effectiveFrom'>) => void;
  switchGoal: (goal: User['goal'], options?: { reductionTargetPerDay?: number; quitDate?: string }) => void;
  setSavingsProject: (project: User['savingsProject']) => void;
  reset: () => void;
  _setHydrated: (value: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      draft: {},
      hydrated: false,
      setUser: (user) => set({ user: { ...user, updatedAt: nowIso() } }),
      updateUser: (patch) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...patch, updatedAt: nowIso() } });
      },
      updateDraft: (patch) => set({ draft: { ...get().draft, ...patch } }),
      clearDraft: () => set({ draft: {} }),
      signPact: (signature) =>
        get().updateUser({ personalPactSignedAt: nowIso(), pactSignature: signature.trim() }),
      setQuitDate: (quitDateIso, options) => {
        const current = get().user;
        if (!current) return;
        const pinned = pinnedSavingsStart(current);
        const now = Date.now();
        let savingsStartDate = pinned;
        if (new Date(pinned).getTime() > now) {
          // Tracking had not started yet (future quit date): follow the new date.
          savingsStartDate = quitDateIso;
        } else if (options?.correction) {
          // Corrected date: earlier moves the start back; a postponed (future) date means the
          // person still smokes until then, so savings restart from that new date.
          if (quitDateIso < pinned || new Date(quitDateIso).getTime() > now) savingsStartDate = quitDateIso;
        }
        get().updateUser({ goal: 'quit', quitDate: quitDateIso, savingsStartDate });
      },
      updateHabits: (habits) => {
        const current = get().user;
        if (!current) return;
        const now = nowIso();
        const history = current.habitsHistory?.length
          ? [...current.habitsHistory]
          : [{ ...habitsTimeline(current)[0]!, effectiveFrom: current.createdAt }];
        const last = history[history.length - 1]!;
        const changed =
          last.cigarettesPerDay !== habits.cigarettesPerDay ||
          last.cigarettesPerPack !== habits.cigarettesPerPack ||
          last.packPriceCents !== habits.packPriceCents;
        if (changed) history.push({ ...habits, effectiveFrom: now });
        get().updateUser({
          habitsHistory: history,
          smokingBaselinePerDay: habits.cigarettesPerDay,
          smoking: {
            ...current.smoking,
            cigarettesPerDay: habits.cigarettesPerDay,
            cigarettesPerPack: habits.cigarettesPerPack,
            packPriceCents: habits.packPriceCents,
          },
          savingsStartDate: pinnedSavingsStart(current),
        });
      },
      switchGoal: (goal, options) => {
        const current = get().user;
        if (!current) return;
        const savingsStartDate = pinnedSavingsStart(current);
        if (goal === 'quit') {
          get().updateUser({ goal, quitDate: options?.quitDate ?? current.quitDate ?? nowIso(), savingsStartDate });
        } else {
          get().updateUser({
            goal,
            reductionTargetPerDay:
              options?.reductionTargetPerDay ??
              current.reductionTargetPerDay ??
              Math.max(1, Math.round(current.smokingBaselinePerDay * 0.75)),
            reductionStartDate: current.goal === 'reduce' && current.reductionStartDate ? current.reductionStartDate : nowIso(),
            savingsStartDate,
          });
        }
      },
      setSavingsProject: (project) => get().updateUser({ savingsProject: project }),
      reset: () => set({ user: null, draft: {} }),
      _setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: STORAGE_KEYS.user,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ user: s.user, draft: s.draft }),
      migrate: (persisted, version) => migrateUserState(persisted, version),
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.warn('[storage] rehydration failed', error);
        useUserStore.setState({ hydrated: true });
      },
    }
  )
);
