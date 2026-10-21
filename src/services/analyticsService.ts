/**
 * Local statistics over the user's own data. No telemetry, no network.
 */
import type { CoughEntry, Craving, InterventionType, SleepEntry, Trigger, WorkoutSession } from '@/types';
import { DAY_MS, dayKey, hourOf, weekdayOf } from '@/utils/dates';

export type Period = '7d' | '30d' | 'all';

export function periodStart(period: Period, now = Date.now()): number | null {
  if (period === 'all') return null;
  const days = period === '7d' ? 7 : 30;
  return now - days * DAY_MS;
}

export function filterByPeriod<T extends { occurredAt: string }>(items: T[], period: Period, now = Date.now()): T[] {
  const start = periodStart(period, now);
  if (start === null) return items;
  return items.filter((i) => new Date(i.occurredAt).getTime() >= start);
}

export interface CravingStats {
  count: number;
  averageIntensity: number | null;
  byHour: number[]; // 24 buckets
  byWeekday: number[]; // 7 buckets, 0 = Sunday
  byTrigger: { trigger: Trigger; count: number }[];
  overcome: number;
  overcomeRate: number | null;
  byIntervention: { intervention: InterventionType; count: number; successRate: number }[];
  /** Cravings per day over the last 14 days, oldest first (for the trend chart). */
  dailyLast14: { day: string; count: number }[];
}

export function computeCravingStats(cravings: Craving[], now = Date.now()): CravingStats {
  const byHour = new Array<number>(24).fill(0);
  const byWeekday = new Array<number>(7).fill(0);
  const triggerCounts = new Map<Trigger, number>();
  const interventionCounts = new Map<InterventionType, { count: number; success: number }>();
  let intensitySum = 0;
  let overcome = 0;
  let withOutcome = 0;
  for (const c of cravings) {
    byHour[hourOf(c.occurredAt)] = (byHour[hourOf(c.occurredAt)] ?? 0) + 1;
    byWeekday[weekdayOf(c.occurredAt)] = (byWeekday[weekdayOf(c.occurredAt)] ?? 0) + 1;
    triggerCounts.set(c.trigger, (triggerCounts.get(c.trigger) ?? 0) + 1);
    intensitySum += c.intensity;
    const success = c.outcome === 'passed' || c.outcome === 'partly_passed';
    if (c.outcome) {
      withOutcome += 1;
      if (success) overcome += 1;
    }
    if (c.interventionType && c.interventionType !== 'none' && c.outcome) {
      const entry = interventionCounts.get(c.interventionType) ?? { count: 0, success: 0 };
      entry.count += 1;
      if (success) entry.success += 1;
      interventionCounts.set(c.interventionType, entry);
    }
  }
  const dailyLast14: { day: string; count: number }[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const day = dayKey(now - i * DAY_MS);
    dailyLast14.push({ day, count: cravings.filter((c) => dayKey(c.occurredAt) === day).length });
  }
  return {
    count: cravings.length,
    averageIntensity: cravings.length ? Math.round((intensitySum / cravings.length) * 10) / 10 : null,
    byHour,
    byWeekday,
    byTrigger: [...triggerCounts.entries()].map(([trigger, count]) => ({ trigger, count })).sort((a, b) => b.count - a.count),
    overcome,
    overcomeRate: withOutcome ? overcome / withOutcome : null,
    byIntervention: [...interventionCounts.entries()]
      .map(([intervention, v]) => ({ intervention, count: v.count, successRate: v.count ? v.success / v.count : 0 }))
      .sort((a, b) => b.successRate - a.successRate || b.count - a.count),
    dailyLast14,
  };
}

export interface WorkoutStats {
  completed: number;
  totalMinutes: number;
  thisWeek: number;
  lastSessionAt: string | null;
  /** Sessions per week over the last 8 weeks, oldest first. */
  weekly: { weekStart: string; count: number }[];
}

export function computeWorkoutStats(sessions: WorkoutSession[], now = Date.now()): WorkoutStats {
  const done = sessions.filter((s) => s.completed);
  const totalMinutes = Math.round(done.reduce((s, x) => s + x.durationSeconds, 0) / 60);
  const weekly: { weekStart: string; count: number }[] = [];
  const today = new Date(now);
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  for (let i = 7; i >= 0; i -= 1) {
    const start = new Date(monday);
    start.setDate(monday.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const count = done.filter((s) => {
      const t = new Date(s.completedAt ?? s.startedAt).getTime();
      return t >= start.getTime() && t < end.getTime();
    }).length;
    weekly.push({ weekStart: dayKey(start), count });
  }
  return {
    completed: done.length,
    totalMinutes,
    thisWeek: weekly[weekly.length - 1]?.count ?? 0,
    lastSessionAt: done.map((s) => s.completedAt ?? s.startedAt).sort().at(-1) ?? null,
    weekly,
  };
}

export function averageSleep(entries: SleepEntry[], lastN = 7): { durationMinutes: number; quality: number } | null {
  const recent = [...entries].sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, lastN);
  if (recent.length === 0) return null;
  return {
    durationMinutes: Math.round(recent.reduce((s, e) => s + e.durationMinutes, 0) / recent.length),
    quality: Math.round((recent.reduce((s, e) => s + e.quality, 0) / recent.length) * 10) / 10,
  };
}

export function coughTrend(entries: CoughEntry[]): 'improving' | 'stable' | 'worsening' | null {
  const sorted = [...entries].sort((a, b) => (a.day < b.day ? -1 : 1));
  if (sorted.length < 4) return null;
  const half = Math.floor(sorted.length / 2);
  const first = sorted.slice(0, half).reduce((s, e) => s + e.intensity, 0) / half;
  const second = sorted.slice(half).reduce((s, e) => s + e.intensity, 0) / (sorted.length - half);
  if (second < first - 1) return 'improving';
  if (second > first + 1) return 'worsening';
  return 'stable';
}
