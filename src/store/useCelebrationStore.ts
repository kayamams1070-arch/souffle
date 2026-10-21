import { create } from 'zustand';

/**
 * Badges unlocked during the current app session, waiting to be celebrated on screen.
 * Not persisted: the badges themselves are stored in the reward store.
 */
interface CelebrationState {
  pendingBadges: string[];
  push: (ids: string[]) => void;
  dismiss: () => void;
}

export const useCelebrationStore = create<CelebrationState>((set, get) => ({
  pendingBadges: [],
  push: (ids) => {
    if (ids.length === 0) return;
    const existing = new Set(get().pendingBadges);
    set({ pendingBadges: [...get().pendingBadges, ...ids.filter((id) => !existing.has(id))] });
  },
  dismiss: () => set({ pendingBadges: [] }),
}));
