import { useEffect, useMemo, useRef } from 'react';
import { useCravingStore, useRewardStore, useUserStore, useWorkoutStore } from '@/store';
import { useCelebrationStore } from '@/store/useCelebrationStore';
import { useNow } from './useNow';
import { dayKey } from '@/utils/dates';
import { evaluateBadges, xpEventId } from '@/services/rewardService';
import { milestoneStatus } from '@/data/healthMilestones';
import { computeStreakInfo } from '@/utils/streaks';
import { getSmokeFreeState, levelProgress } from '@/utils/calculations';
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
 * data changes or the local day changes (a streak grows at midnight without any action).
 * Newly unlocked badges are pushed to the celebration store so screens can show them.
 */
export function useRewardsSync(): { newlyUnlocked: string[]; dismiss: () => void } {
  const user = useUserStore((s) => s.user);
  const cravings = useCravingStore((s) => s.cravings);
  const smokingEvents = useCravingStore((s) => s.smokingEvents);
  const sessions = useWorkoutStore((s) => s.sessions);
  const shieldUses = useRewardStore((s) => s.shieldUses);
  const freezes = useRewardStore((s) => s.freezes);
  const newlyUnlocked = useCelebrationStore((s) => s.pendingBadges);
  const dismiss = useCelebrationStore((s) => s.dismiss);
  const nowMs = useNow(60_000);
  const today = dayKey(nowMs);
  // Coarse key so milestones are re-checked every 10 minutes without rerunning every tick.
  const slot = Math.floor(nowMs / 600_000);
  const lastRun = useRef<string>('');

  useEffect(() => {
    if (!user) return;
    const completed = sessions.filter((s) => s.completed).length;
    const signature = `${slot}:${today}:${user.id}:${user.quitDate ?? ''}:${cravings.length}:${smokingEvents.length}:${completed}:${shieldUses.length}:${freezes.length}:${user.personalPactSignedAt ?? ''}`;
    if (signature === lastRun.current) return;
    lastRun.current = signature;
    const rewards = useRewardStore.getState();
    const info = computeStreakInfo(user, smokingEvents, rewards);
    rewards.recordBestStreak(info.currentDays);
    const ids = evaluateBadges({
      user,
      cravings,
      smokingEvents,
      sessions,
      rewards: { ...rewards, bestStreakDays: Math.max(rewards.bestStreakDays, info.currentDays) },
    });
    useCelebrationStore.getState().push(rewards.unlockBadges(ids));
    // Health milestones reached on the current smoke-free run: XP once per milestone, ever.
    const state = getSmokeFreeState(user, smokingEvents, nowMs);
    if (state.status === 'running') {
      for (const m of milestoneStatus(state.duration.totalMs / 60_000).reached) {
        rewards.awardXp(xpEventId.milestone(m.id), 'milestone');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nowMs is read through `slot`
  }, [user, cravings, smokingEvents, sessions, shieldUses, freezes, today, slot]);

  return { newlyUnlocked, dismiss };
}

export function useLevel() {
  const xp = useRewardStore((s) => s.xp);
  return useMemo(() => ({ xp, ...levelProgress(xp) }), [xp]);
}
