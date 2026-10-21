/**
 * "Météo des envies": transparent, statistical, local. Produces a qualitative trend only
 * when enough observations exist; never fabricates a prediction.
 */
import type { Craving, InterventionType, Trigger } from '@/types';
import { FORECAST_MIN_CRAVINGS } from '@/utils/constants';
import { computeCravingStats } from './analyticsService';

export type TimeSlot = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

export function slotForHour(hour: number): TimeSlot {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'night';
}

export interface CravingForecast {
  enough: boolean;
  observations: number;
  /** Most frequent time slot and its share of cravings (0..1). */
  peakSlot?: { slot: TimeSlot; share: number };
  /** Most frequent weekday (0 = Sunday) and its share. */
  peakWeekday?: { weekday: number; share: number };
  topTrigger?: { trigger: Trigger; share: number };
  bestIntervention?: { intervention: InterventionType; successRate: number; count: number };
  /** Whether the current moment falls inside the peak slot. */
  nowInPeak: boolean;
  /** Qualitative confidence based on sample size. */
  confidence: 'low' | 'medium' | 'high';
}

export function computeForecast(cravings: Craving[], now = Date.now()): CravingForecast {
  const observations = cravings.length;
  if (observations < FORECAST_MIN_CRAVINGS) {
    return { enough: false, observations, nowInPeak: false, confidence: 'low' };
  }
  const stats = computeCravingStats(cravings, now);
  const slotCounts: Record<TimeSlot, number> = { morning: 0, midday: 0, afternoon: 0, evening: 0, night: 0 };
  stats.byHour.forEach((count, hour) => {
    slotCounts[slotForHour(hour)] += count;
  });
  const [peakSlotName, peakSlotCount] = (Object.entries(slotCounts) as [TimeSlot, number][]).sort((a, b) => b[1] - a[1])[0]!;
  const weekdayIdx = stats.byWeekday.indexOf(Math.max(...stats.byWeekday));
  const weekdayCount = stats.byWeekday[weekdayIdx] ?? 0;
  const topTrigger = stats.byTrigger[0];
  const best = stats.byIntervention.filter((i) => i.count >= 3)[0];
  const confidence: CravingForecast['confidence'] = observations >= 40 ? 'high' : observations >= 20 ? 'medium' : 'low';
  const peakShare = peakSlotCount / observations;
  return {
    enough: true,
    observations,
    peakSlot: peakShare >= 0.3 ? { slot: peakSlotName, share: peakShare } : undefined,
    peakWeekday: weekdayCount / observations >= 0.25 ? { weekday: weekdayIdx, share: weekdayCount / observations } : undefined,
    topTrigger: topTrigger && topTrigger.count / observations >= 0.25 ? { trigger: topTrigger.trigger, share: topTrigger.count / observations } : undefined,
    bestIntervention: best ? { intervention: best.intervention, successRate: best.successRate, count: best.count } : undefined,
    nowInPeak: peakShare >= 0.3 && slotForHour(new Date(now).getHours()) === peakSlotName,
    confidence,
  };
}
