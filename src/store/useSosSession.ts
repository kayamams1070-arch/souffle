import { create } from 'zustand';
import type { InterventionType, Trigger } from '@/types';

/**
 * In-memory state of the SOS flow currently in progress (not persisted: an interrupted
 * session is simply not logged, which is preferable to a half-written record).
 */
export interface SosSessionState {
  active: boolean;
  startedAt: string | null;
  intervention: InterventionType | null;
  intensity: number | null;
  trigger: Trigger | null;
  /** Existing craving to attach the result to (when started from the craving log). */
  cravingId: string | null;
  durationSeconds: number;
  completed: boolean;
  begin: (data: { intervention: InterventionType; intensity?: number | null; trigger?: Trigger | null; cravingId?: string | null }) => void;
  finish: (durationSeconds: number, completed: boolean) => void;
  setIntake: (data: { intensity?: number | null; trigger?: Trigger | null }) => void;
  clear: () => void;
}

export const useSosSession = create<SosSessionState>((set, get) => ({
  active: false,
  startedAt: null,
  intervention: null,
  intensity: null,
  trigger: null,
  cravingId: null,
  durationSeconds: 0,
  completed: false,
  begin: (data) =>
    set({
      active: true,
      startedAt: new Date().toISOString(),
      intervention: data.intervention,
      intensity: data.intensity ?? get().intensity,
      trigger: data.trigger ?? get().trigger,
      cravingId: data.cravingId ?? get().cravingId,
      durationSeconds: 0,
      completed: false,
    }),
  finish: (durationSeconds, completed) => set({ durationSeconds, completed }),
  setIntake: (data) => set({ intensity: data.intensity ?? get().intensity, trigger: data.trigger ?? get().trigger }),
  clear: () =>
    set({ active: false, startedAt: null, intervention: null, intensity: null, trigger: null, cravingId: null, durationSeconds: 0, completed: false }),
}));
