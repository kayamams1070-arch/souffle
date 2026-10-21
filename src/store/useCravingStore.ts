import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Craving, SmokingEvent } from '@/types';
import { STORAGE_KEYS, zustandStorage } from '@/services/storageService';
import { migrateCravingState } from '@/services/migrationService';
import { SCHEMA_VERSION } from '@/utils/constants';
import { createId } from '@/utils/ids';
import { nowIso } from '@/utils/dates';

export interface CravingState {
  cravings: Craving[];
  smokingEvents: SmokingEvent[];
  hydrated: boolean;
  addCraving: (craving: Omit<Craving, 'id'> & { id?: string }) => Craving;
  updateCraving: (id: string, patch: Partial<Craving>) => void;
  removeCraving: (id: string) => void;
  addSmokingEvent: (event: Omit<SmokingEvent, 'id'> & { id?: string }) => SmokingEvent;
  updateSmokingEvent: (id: string, patch: Partial<SmokingEvent>) => void;
  removeSmokingEvent: (id: string) => void;
  replaceAll: (data: { cravings: Craving[]; smokingEvents: SmokingEvent[] }) => void;
  reset: () => void;
  _setHydrated: (value: boolean) => void;
}

const sortByDateDesc = <T extends { occurredAt: string }>(items: T[]) =>
  [...items].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));

export const useCravingStore = create<CravingState>()(
  persist(
    (set, get) => ({
      cravings: [],
      smokingEvents: [],
      hydrated: false,
      addCraving: (input) => {
        const craving: Craving = {
          ...input,
          id: input.id ?? createId('crv'),
          occurredAt: input.occurredAt || nowIso(),
        };
        set({ cravings: sortByDateDesc([...get().cravings, craving]) });
        return craving;
      },
      updateCraving: (id, patch) =>
        set({
          cravings: sortByDateDesc(get().cravings.map((c) => (c.id === id ? { ...c, ...patch } : c))),
        }),
      removeCraving: (id) => set({ cravings: get().cravings.filter((c) => c.id !== id) }),
      addSmokingEvent: (input) => {
        const event: SmokingEvent = {
          ...input,
          id: input.id ?? createId('smk'),
          occurredAt: input.occurredAt || nowIso(),
        };
        set({ smokingEvents: sortByDateDesc([...get().smokingEvents, event]) });
        return event;
      },
      updateSmokingEvent: (id, patch) =>
        set({
          smokingEvents: sortByDateDesc(
            get().smokingEvents.map((e) => (e.id === id ? { ...e, ...patch } : e))
          ),
        }),
      removeSmokingEvent: (id) =>
        set({ smokingEvents: get().smokingEvents.filter((e) => e.id !== id) }),
      replaceAll: (data) =>
        set({
          cravings: sortByDateDesc(data.cravings),
          smokingEvents: sortByDateDesc(data.smokingEvents),
        }),
      reset: () => set({ cravings: [], smokingEvents: [] }),
      _setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: STORAGE_KEYS.cravings,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ cravings: s.cravings, smokingEvents: s.smokingEvents }),
      migrate: (persisted, version) => migrateCravingState(persisted, version),
      onRehydrateStorage: () => (state) => state?._setHydrated(true),
    }
  )
);
