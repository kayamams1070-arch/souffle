export { useUserStore } from './useUserStore';
export { useCravingStore } from './useCravingStore';
export { useWorkoutStore } from './useWorkoutStore';
export { useRewardStore } from './useRewardStore';
export { useJournalStore } from './useJournalStore';
export { useSettingsStore, DEFAULT_SETTINGS, DEFAULT_NOTIFICATIONS } from './useSettingsStore';

import { useUserStore } from './useUserStore';
import { useCravingStore } from './useCravingStore';
import { useWorkoutStore } from './useWorkoutStore';
import { useRewardStore } from './useRewardStore';
import { useJournalStore } from './useJournalStore';
import { useSettingsStore } from './useSettingsStore';

/** True once every persisted store has been rehydrated from disk. */
export function useStoresHydrated(): boolean {
  const a = useUserStore((s) => s.hydrated);
  const b = useCravingStore((s) => s.hydrated);
  const c = useWorkoutStore((s) => s.hydrated);
  const d = useRewardStore((s) => s.hydrated);
  const e = useJournalStore((s) => s.hydrated);
  const f = useSettingsStore((s) => s.hydrated);
  return a && b && c && d && e && f;
}

/** Resets every in-memory store (storage is cleared separately by storageService). */
export function resetAllStores(): void {
  useUserStore.getState().reset();
  useCravingStore.getState().reset();
  useWorkoutStore.getState().reset();
  useRewardStore.getState().reset();
  useJournalStore.getState().reset();
  useSettingsStore.getState().reset();
}
