import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Challenge, CoughEntry, JournalEntry, SleepEntry } from '@/types';
import { STORAGE_KEYS, zustandStorage } from '@/services/storageService';
import { migrateJournalState } from '@/services/migrationService';
import { SCHEMA_VERSION } from '@/utils/constants';
import { createId } from '@/utils/ids';

export interface JournalState {
  entries: JournalEntry[];
  sleep: SleepEntry[];
  cough: CoughEntry[];
  challenges: Challenge[];
  hydrated: boolean;
  addEntry: (entry: Omit<JournalEntry, 'id'> & { id?: string }) => JournalEntry;
  removeEntry: (id: string) => void;
  upsertSleep: (entry: Omit<SleepEntry, 'id'> & { id?: string }) => SleepEntry;
  removeSleep: (id: string) => void;
  upsertCough: (entry: Omit<CoughEntry, 'id'> & { id?: string }) => CoughEntry;
  removeCough: (id: string) => void;
  addChallenge: (challenge: Omit<Challenge, 'id'> & { id?: string }) => Challenge;
  removeChallenge: (id: string) => void;
  replaceAll: (data: Pick<JournalState, 'entries' | 'sleep' | 'cough' | 'challenges'>) => void;
  reset: () => void;
  _setHydrated: (value: boolean) => void;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],
      sleep: [],
      cough: [],
      challenges: [],
      hydrated: false,
      addEntry: (input) => {
        const entry: JournalEntry = { ...input, id: input.id ?? createId('jr') };
        set({ entries: [entry, ...get().entries].sort((a, b) => (a.date < b.date ? 1 : -1)) });
        return entry;
      },
      removeEntry: (id) => set({ entries: get().entries.filter((e) => e.id !== id) }),
      upsertSleep: (input) => {
        // One entry per night: an existing entry for the same day is replaced.
        const others = get().sleep.filter((s) => s.day !== input.day);
        const entry: SleepEntry = { ...input, id: input.id ?? createId('slp') };
        set({ sleep: [...others, entry].sort((a, b) => (a.day < b.day ? -1 : 1)) });
        return entry;
      },
      removeSleep: (id) => set({ sleep: get().sleep.filter((s) => s.id !== id) }),
      upsertCough: (input) => {
        const others = get().cough.filter((c) => c.day !== input.day);
        const entry: CoughEntry = { ...input, id: input.id ?? createId('cgh') };
        set({ cough: [...others, entry].sort((a, b) => (a.day < b.day ? -1 : 1)) });
        return entry;
      },
      removeCough: (id) => set({ cough: get().cough.filter((c) => c.id !== id) }),
      addChallenge: (input) => {
        const challenge: Challenge = { ...input, id: input.id ?? createId('chl') };
        set({ challenges: [challenge, ...get().challenges] });
        return challenge;
      },
      removeChallenge: (id) => set({ challenges: get().challenges.filter((c) => c.id !== id) }),
      replaceAll: (data) =>
        set({ entries: data.entries, sleep: data.sleep, cough: data.cough, challenges: data.challenges }),
      reset: () => set({ entries: [], sleep: [], cough: [], challenges: [] }),
      _setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: STORAGE_KEYS.journal,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ entries: s.entries, sleep: s.sleep, cough: s.cough, challenges: s.challenges }),
      migrate: (persisted, version) => migrateJournalState(persisted, version),
      // Even if a stored value is corrupt, never leave the app stuck on the splash screen.
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.warn('[storage] rehydration failed', error);
        useJournalStore.setState({ hydrated: true });
      },
    }
  )
);
