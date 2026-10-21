import { computeCravingStats, coughTrend, filterByPeriod } from '@/services/analyticsService';
import { computeForecast, slotForHour } from '@/services/cravingPredictionService';
import { FORECAST_MIN_CRAVINGS } from '@/utils/constants';
import { craving, local, ms } from './helpers';

describe('computeCravingStats', () => {
  const now = ms(local(2026, 4, 20, 22));
  const list = [
    craving(local(2026, 4, 20, 8), {
      intensity: 8,
      trigger: 'coffee',
      interventionType: 'breathing',
      outcome: 'passed',
    }),
    craving(local(2026, 4, 19, 8), {
      intensity: 6,
      trigger: 'coffee',
      interventionType: 'breathing',
      outcome: 'persisted',
    }),
    craving(local(2026, 4, 18, 13), {
      intensity: 4,
      trigger: 'after_meal',
      interventionType: 'workout',
      outcome: 'partly_passed',
    }),
    craving(local(2026, 4, 1, 20), { intensity: 2, trigger: 'stress' }),
  ];

  it('aggregates counts, intensity and outcomes from real entries only', () => {
    const s = computeCravingStats(list, now);
    expect(s.count).toBe(4);
    expect(s.averageIntensity).toBe(5);
    expect(s.byHour[8]).toBe(2);
    expect(s.byHour[13]).toBe(1);
    expect(s.byTrigger[0]).toEqual({ trigger: 'coffee', count: 2 });
    expect(s.overcome).toBe(2);
    expect(s.overcomeRate).toBeCloseTo(2 / 3);
  });

  it('ranks interventions by declared success', () => {
    const s = computeCravingStats(list, now);
    expect(s.byIntervention[0]).toEqual({ intervention: 'workout', count: 1, successRate: 1 });
    expect(s.byIntervention[1]).toEqual({ intervention: 'breathing', count: 2, successRate: 0.5 });
  });

  it('does not invent values for empty days', () => {
    const s = computeCravingStats(list, now);
    expect(s.dailyLast14).toHaveLength(14);
    expect(s.dailyLast14.reduce((a, d) => a + d.count, 0)).toBe(3);
    expect(computeCravingStats([], now).averageIntensity).toBeNull();
    expect(computeCravingStats([], now).overcomeRate).toBeNull();
  });

  it('filters 7 days / 30 days / all', () => {
    expect(filterByPeriod(list, '7d', now)).toHaveLength(3);
    expect(filterByPeriod(list, '30d', now)).toHaveLength(4);
    expect(filterByPeriod(list, 'all', now)).toHaveLength(4);
  });
});

describe('craving forecast ("météo des envies")', () => {
  it('says nothing below the minimum number of observations', () => {
    const few = Array.from({ length: FORECAST_MIN_CRAVINGS - 1 }, (_, i) =>
      craving(local(2026, 4, 1 + i, 15))
    );
    const f = computeForecast(few);
    expect(f.enough).toBe(false);
    expect(f.peakSlot).toBeUndefined();
    expect(f.peakWeekday).toBeUndefined();
  });

  it('finds a clear afternoon / Wednesday pattern with an honest confidence', () => {
    // 1 April 2026 is a Wednesday
    const wednesdays = Array.from({ length: 6 }, (_, i) =>
      craving(local(2026, 4, 1 + i * 7, 15), { trigger: 'stress' })
    );
    const others = [
      craving(local(2026, 4, 2, 9)),
      craving(local(2026, 4, 4, 21)),
      craving(local(2026, 4, 5, 12)),
    ];
    const f = computeForecast([...wednesdays, ...others], ms(local(2026, 5, 13, 15)));
    expect(f.enough).toBe(true);
    expect(f.peakSlot?.slot).toBe('afternoon');
    expect(f.peakWeekday?.weekday).toBe(3);
    expect(f.topTrigger?.trigger).toBe('stress');
    expect(f.confidence).toBe('low');
    expect(f.nowInPeak).toBe(true);
  });

  it('does not report a peak when cravings are spread out', () => {
    const hours = [6, 9, 12, 13, 15, 16, 19, 20, 23, 2];
    const spread = hours.map((h, i) =>
      craving(local(2026, 4, 1 + i, h), {
        trigger: (['coffee', 'stress', 'boredom', 'social', 'fatigue'] as const)[i % 5],
      })
    );
    const f = computeForecast(spread);
    expect(f.enough).toBe(true);
    expect(f.peakSlot).toBeUndefined();
    expect(f.topTrigger).toBeUndefined();
  });

  it('maps hours to slots', () => {
    expect([5, 11, 14, 18, 23, 2].map(slotForHour)).toEqual([
      'morning',
      'midday',
      'afternoon',
      'evening',
      'night',
      'night',
    ]);
  });
});

describe('cough trend', () => {
  it('needs 4 entries and compares the two halves', () => {
    const mk = (day: string, intensity: number) => ({
      id: day,
      day,
      intensity,
      frequency: 'sometimes' as const,
    });
    expect(coughTrend([mk('2026-04-01', 6), mk('2026-04-02', 6)])).toBeNull();
    expect(
      coughTrend([
        mk('2026-04-01', 7),
        mk('2026-04-03', 6),
        mk('2026-04-05', 3),
        mk('2026-04-07', 2),
      ])
    ).toBe('improving');
    expect(
      coughTrend([
        mk('2026-04-01', 2),
        mk('2026-04-03', 2),
        mk('2026-04-05', 5),
        mk('2026-04-07', 6),
      ])
    ).toBe('worsening');
  });
});
