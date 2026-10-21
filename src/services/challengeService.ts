/**
 * Local, private challenges. Progress is computed from the user's own data; there are no
 * remote participants in this version (see services/future/socialService for the planned API).
 */
import type { Challenge, Craving, SmokingEvent, User, WorkoutSession } from '@/types';
import { dayKey, dayKeysBetween } from '@/utils/dates';
import { firstFullDayAfter, smokedOnDay } from '@/utils/streaks';
import { savingsStart } from '@/utils/calculations';

export interface ChallengeProgress {
  value: number;
  target: number;
  ratio: number;
  status: 'upcoming' | 'active' | 'completed' | 'ended';
}

export function challengeProgress(
  challenge: Challenge,
  data: { user: User | null; smokingEvents: SmokingEvent[]; sessions: WorkoutSession[]; cravings: Craving[] },
  now = Date.now()
): ChallengeProgress {
  const today = dayKey(now);
  const inRange = (iso: string) => {
    const d = dayKey(iso);
    return d >= challenge.startDay && d <= challenge.endDay;
  };
  let value = 0;
  if (challenge.kind === 'workouts') {
    value = data.sessions.filter((s) => s.completed && inRange(s.completedAt ?? s.startedAt)).length;
  } else if (challenge.kind === 'cravings_overcome') {
    value = data.cravings.filter((c) => (c.outcome === 'passed' || c.outcome === 'partly_passed') && inRange(c.occurredAt)).length;
  } else if (data.user && data.user.goal === 'quit' && data.user.quitDate) {
    // Only complete past days count, and only after tracking started.
    const first = firstFullDayAfter(savingsStart(data.user));
    value = dayKeysBetween(challenge.startDay, challenge.endDay).filter((d) => d < today && d >= first && !smokedOnDay(d, data.smokingEvents)).length;
  }
  const status: ChallengeProgress['status'] =
    value >= challenge.target ? 'completed' : today < challenge.startDay ? 'upcoming' : today > challenge.endDay ? 'ended' : 'active';
  return { value, target: challenge.target, ratio: Math.min(1, value / Math.max(1, challenge.target)), status };
}
