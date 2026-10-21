import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BreathingTest, SportLevel, WorkoutSession } from '@/types';
import { STORAGE_KEYS, zustandStorage } from '@/services/storageService';
import { migrateWorkoutState } from '@/services/migrationService';
import { SCHEMA_VERSION } from '@/utils/constants';
import { createId } from '@/utils/ids';
import { nowIso } from '@/utils/dates';

export interface WorkoutState {
  sessions: WorkoutSession[];
  breathingTests: BreathingTest[];
  /** Level the user explicitly chose to train at (may be lower than the unlocked one). */
  activeLevel: SportLevel | null;
  hydrated: boolean;
  startSession: (workoutId: string, level: SportLevel, totalBlocks: number) => WorkoutSession;
  completeSession: (
    id: string,
    data: { durationSeconds: number; blocksCompleted: number; perceivedEffort?: number; notes?: string }
  ) => WorkoutSession | null;
  abandonSession: (id: string, data: { durationSeconds: number; blocksCompleted: number }) => void;
  annotateSession: (id: string, data: { perceivedEffort?: number; notes?: string }) => void;
  addBreathingTest: (test: Omit<BreathingTest, 'id'> & { id?: string }) => BreathingTest;
  setActiveLevel: (level: SportLevel) => void;
  replaceAll: (data: { sessions: WorkoutSession[]; breathingTests: BreathingTest[]; activeLevel?: SportLevel | null }) => void;
  reset: () => void;
  _setHydrated: (value: boolean) => void;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      sessions: [],
      breathingTests: [],
      activeLevel: null,
      hydrated: false,
      startSession: (workoutId, level, totalBlocks) => {
        const session: WorkoutSession = {
          id: createId('ws'),
          workoutId,
          startedAt: nowIso(),
          durationSeconds: 0,
          completed: false,
          level,
          blocksCompleted: 0,
          totalBlocks,
        };
        set({ sessions: [session, ...get().sessions] });
        return session;
      },
      completeSession: (id, data) => {
        let updated: WorkoutSession | null = null;
        set({
          sessions: get().sessions.map((s) => {
            if (s.id !== id) return s;
            // Idempotent: a session already completed is not re-completed.
            if (s.completed) {
              updated = s;
              return s;
            }
            updated = { ...s, ...data, completed: true, completedAt: nowIso() };
            return updated;
          }),
        });
        return updated;
      },
      abandonSession: (id, data) =>
        set({
          sessions: get().sessions.map((s) =>
            s.id === id && !s.completed ? { ...s, ...data, completedAt: nowIso() } : s
          ),
        }),
      annotateSession: (id, data) =>
        set({
          sessions: get().sessions.map((s) =>
            s.id === id
              ? { ...s, perceivedEffort: data.perceivedEffort ?? s.perceivedEffort, notes: data.notes ?? s.notes }
              : s
          ),
        }),
      addBreathingTest: (input) => {
        const test: BreathingTest = { ...input, id: input.id ?? createId('bt') };
        set({ breathingTests: [...get().breathingTests, test].sort((a, b) => (a.date < b.date ? -1 : 1)) });
        return test;
      },
      setActiveLevel: (level) => set({ activeLevel: level }),
      replaceAll: (data) =>
        set({
          sessions: data.sessions,
          breathingTests: data.breathingTests,
          activeLevel: data.activeLevel ?? null,
        }),
      reset: () => set({ sessions: [], breathingTests: [], activeLevel: null }),
      _setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: STORAGE_KEYS.workouts,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        sessions: s.sessions,
        breathingTests: s.breathingTests,
        activeLevel: s.activeLevel,
      }),
      migrate: (persisted, version) => migrateWorkoutState(persisted, version),
      onRehydrateStorage: () => (state) => state?._setHydrated(true),
    }
  )
);
