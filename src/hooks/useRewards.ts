import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCravingStore, useRewardStore, useUserStore, useWorkoutStore } from '@/store';
import { evaluateBadges } from '@/services/rewardService';
import { computeStreakInfo } from '@/utils/streaks';
import { levelProgress } from '@/utils/calculations';
import type { StreakInfo } from '@/types';

/** Streak information derived from events (never stored as a drifting counter). */
export function useStreak(): StreakInfo {
  const user = useUserStore((s) => s.user);
  const events = useCravingStore((s) => s.smokingEvents);
  const xp = useRewardStore((s) => s.xp);
  const shieldUses = useRewardStore((s) => s.shieldUses);
  const freezes = useRewardStore((s) => s.freezes);
  const bestStreakDays = useRewardStore((s) => s.bestStreakDays);
  const badges = useRewardStore((s) => s.badges);
  const eventsXp = useRewardStore((s) => s.events);
  return useMemo(() => {
    if (!user) {
      return { currentDays: 0, bestDays: bestStreakDays, shieldAvailable: true, frozen: false };
    }
    return computeStreakInfo(user, events, { xp, events: eventsXp, badges, shieldUses, freezes, bestStreakDays });
  }, [user, events, xp, eventsXp, badges, shieldUses, freezes, bestStreakDays]);
}

/**
 * Keeps badges and the best streak in sync with the facts. Runs whenever the underlying
 * data changes; returns the ids of badges unlocked during this app session so screens
 * can celebrate them.
 */
export function useRewardsSync(): { newlyUnlocked: string[]; dismiss: () => void } {
  const user = useUserStore((s) => s.user);
  const cravings = useCravingStore((s) => s.cravings);
  const smokingEvents = useCravingStore((s) => s.smokingEvents);
  const sessions = useWorkoutStore((s) => s.sessions);
  const rewards = useRewardStore();
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
  const lastRun = useRef<string>('');

  useEffect(() => {
    if (!user) return;
    const signature = `${cravings.length}:${smokingEvents.length}:${sessions.filter((s) => s.completed).length}:${rewards.shieldUses.length}:${rewards.freezes.length}:${user.personalPactSignedAt ?? ''}`;
    if (signature === lastRun.current) return;
    lastRun.current = signature;
    const info = computeStreakInfo(user, smokingEvents, rewards);
    rewards.recordBestStreak(info.currentDays);
    const ids = evaluateBadges({
      user,
      cravings,
      smokingEvents,
      sessions,
      rewards: { ...rewards, bestStreakDays: Math.max(rewards.bestStreakDays, info.currentDays) },
    });
    const fresh = rewards.unlockBadges(ids);
    if (fresh.length > 0) setNewlyUnlocked((prev) => [...prev, ...fresh]);
  }, [user, cravings, smokingEvents, sessions, rewards]);

  const dismiss = useCallback(() => setNewlyUnlocked([]), []);
  return { newlyUnlocked, dismiss };
}

export function useLevel() {
  const xp = useRewardStore((s) => s.xp);
  return useMemo(() => ({ xp, ...levelProgress(xp) }), [xp]);
}
