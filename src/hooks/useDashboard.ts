import { useMemo } from 'react';
import { useCravingStore, useUserStore, useWorkoutStore } from '@/store';
import { computeReductionStats, computeSavings, getSmokeFreeState } from '@/utils/calculations';
import { milestoneStatus } from '@/data/healthMilestones';
import { nextProgramWorkout } from '@/services/recommendationService';
import { useNow } from './useNow';

export function useDashboard() {
  const user = useUserStore((s) => s.user);
  const smokingEvents = useCravingStore((s) => s.smokingEvents);
  const sessions = useWorkoutStore((s) => s.sessions);
  const activeLevel = useWorkoutStore((s) => s.activeLevel);
  const now = useNow(1000);

  const smokeFree = useMemo(() => (user ? getSmokeFreeState(user, smokingEvents, now) : null), [user, smokingEvents, now]);
  // Savings only need a refresh every minute; derive from a coarser instant.
  const minute = Math.floor(now / 60_000) * 60_000;
  const savings = useMemo(() => (user ? computeSavings(user, smokingEvents, minute) : null), [user, smokingEvents, minute]);
  const reduction = useMemo(() => (user && user.goal === 'reduce' ? computeReductionStats(user, smokingEvents, minute) : null), [user, smokingEvents, minute]);
  const milestones = useMemo(() => {
    const substance = user?.smoking.substance ?? 'tobacco';
    if (!smokeFree || smokeFree.status !== 'running') return milestoneStatus(0, substance);
    return milestoneStatus(smokeFree.duration.totalMs / 60_000, substance);
  }, [smokeFree, user?.smoking.substance]);
  const nextWorkout = useMemo(() => (user ? nextProgramWorkout(user, sessions, activeLevel, minute) : null), [user, sessions, activeLevel, minute]);
  const completedWorkouts = useMemo(() => sessions.filter((s) => s.completed).length, [sessions]);

  return { user, smokeFree, savings, reduction, milestones, nextWorkout, completedWorkouts, now };
}
