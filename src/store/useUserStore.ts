import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { OnboardingDraft, User } from '@/types';
import { STORAGE_KEYS, zustandStorage } from '@/services/storageService';
import { migrateUserState } from '@/services/migrationService';
import { SCHEMA_VERSION } from '@/utils/constants';
import { nowIso } from '@/utils/dates';

export interface UserState {
  user: User | null;
  draft: OnboardingDraft;
  hydrated: boolean;
  setUser: (user: User) => void;
  updateUser: (patch: Partial<User>) => void;
  updateDraft: (patch: OnboardingDraft) => void;
  clearDraft: () => void;
  signPact: (signature: string) => void;
  setQuitDate: (quitDateIso: string) => void;
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
      setQuitDate: (quitDateIso) => get().updateUser({ goal: 'quit', quitDate: quitDateIso }),
      switchGoal: (goal, options) => {
        const current = get().user;
        if (!current) return;
        if (goal === 'quit') {
          get().updateUser({ goal, quitDate: options?.quitDate ?? current.quitDate ?? nowIso() });
        } else {
          get().updateUser({
            goal,
            reductionTargetPerDay:
              options?.reductionTargetPerDay ??
              current.reductionTargetPerDay ??
              Math.max(1, Math.round(current.smokingBaselinePerDay * 0.75)),
            reductionStartDate: current.reductionStartDate ?? nowIso(),
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
      onRehydrateStorage: () => (state) => {
        state?._setHydrated(true);
      },
    }
  )
);
