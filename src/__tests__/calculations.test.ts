import {
  computeReductionStats,
  computeSavings,
  getSmokeFreeState,
  habitsAt,
  habitsTimeline,
  levelFromXp,
  levelProgress,
  pricePerCigaretteCents,
  savingsStart,
  xpForLevel,
} from '@/utils/calculations';
import { dayKey, DAY_MS, HOUR_MS, splitDuration } from '@/utils/dates';
import { local, makeUser, ms, smoke } from './helpers';

describe('timezone setup', () => {
  it('runs in a DST time zone (Europe/Brussels)', () => {
    expect(new Date(2026, 0, 15).getTimezoneOffset()).toBe(-60);
    expect(new Date(2026, 6, 15).getTimezoneOffset()).toBe(-120);
  });
});

describe('pricePerCigaretteCents', () => {
  it('divides pack price by cigarettes per pack', () => {
    expect(pricePerCigaretteCents(1000, 20)).toBe(50);
    expect(pricePerCigaretteCents(950, 19)).toBe(50);
  });
  it('returns 0 for an invalid pack size', () => {
    expect(pricePerCigaretteCents(1000, 0)).toBe(0);
  });
});

describe('getSmokeFreeState (smoke-free counter)', () => {
  const quit = local(2026, 3, 10, 8);
  const user = makeUser({ quitDate: quit, savingsStartDate: quit });

  it('counts days / hours / minutes / seconds from the real quit instant', () => {
    const now = ms(quit) + 2 * DAY_MS + 3 * HOUR_MS + 4 * 60_000 + 5_000;
    const state = getSmokeFreeState(user, [], now);
    expect(state.status).toBe('running');
    expect(state.duration).toMatchObject({ days: 2, hours: 3, minutes: 4, seconds: 5 });
  });

  it('shows a countdown when the quit date is in the future', () => {
    const now = ms(quit) - 5 * HOUR_MS;
    const state = getSmokeFreeState(user, [], now);
    expect(state.status).toBe('future');
    expect(state.untilStart.hours).toBe(5);
    expect(state.duration.totalMs).toBe(0);
  });

  it('restarts from the last cigarette logged after the quit date', () => {
    const relapse = local(2026, 3, 12, 21);
    const now = ms(relapse) + 3 * HOUR_MS;
    const state = getSmokeFreeState(user, [smoke(relapse)], now);
    expect(state.since).toBe(new Date(relapse).toISOString());
    expect(state.duration.hours).toBe(3);
  });

  it('ignores cigarettes logged before the quit date', () => {
    const before = local(2026, 3, 9, 20);
    const state = getSmokeFreeState(user, [smoke(before)], ms(quit) + DAY_MS);
    expect(state.since).toBe(new Date(quit).toISOString());
  });

  it('is not shown for the reduction goal (no misleading abstinence counter)', () => {
    const reducer = makeUser({ goal: 'reduce', quitDate: undefined, reductionTargetPerDay: 10 });
    expect(getSmokeFreeState(reducer, [], Date.now()).status).toBe('none');
  });

  it('measures real elapsed time across the spring DST change (23-hour day)', () => {
    // 29 March 2026: clocks go from 02:00 to 03:00 in Brussels.
    const start = local(2026, 3, 28, 12);
    const end = local(2026, 3, 29, 12);
    const u = makeUser({ quitDate: start });
    const state = getSmokeFreeState(u, [], ms(end));
    expect(state.duration.days).toBe(0);
    expect(state.duration.hours).toBe(23);
  });
});

describe('computeSavings (quit goal)', () => {
  const quit = local(2026, 3, 1, 8);
  const user = makeUser({ quitDate: quit, savingsStartDate: quit });

  it('estimates savings from declared habits (20/day at 0.50 €)', () => {
    const s = computeSavings(user, [], ms(quit) + 10 * DAY_MS);
    expect(s.cigarettesAvoided).toBe(200);
    expect(s.savedCents).toBe(10_000);
    expect(s.perDayCents).toBe(1000);
  });

  it('subtracts cigarettes actually logged', () => {
    const s = computeSavings(user, [smoke(local(2026, 3, 3, 20), 4)], ms(quit) + 10 * DAY_MS);
    expect(s.cigarettesAvoided).toBe(196);
    expect(s.savedCents).toBe(9_800);
    expect(s.spentSincePlanCents).toBe(200);
  });

  it('projects 1, 5 and 10 years from the current daily spending', () => {
    const s = computeSavings(user, [], ms(quit) + DAY_MS);
    expect(s.projectionOneYearCents).toBe(Math.round(1000 * 365.25));
    expect(s.projectionFiveYearsCents).toBe(Math.round(1000 * 365.25 * 5));
    expect(s.projectionTenYearsCents).toBe(Math.round(1000 * 365.25 * 10));
  });

  it('is zero before a future quit date', () => {
    const future = makeUser({ quitDate: local(2026, 5, 1), savingsStartDate: local(2026, 5, 1) });
    const s = computeSavings(future, [], ms(local(2026, 4, 1)));
    expect(s.savedCents).toBe(0);
    expect(s.since).toBeNull();
  });

  it('keeps savings history when a new quit date is chosen after a relapse', () => {
    const relapseAt = local(2026, 3, 11, 8);
    const restarted = { ...user, quitDate: relapseAt }; // savingsStartDate unchanged
    const s = computeSavings(restarted, [smoke(relapseAt, 2)], ms(quit) + 20 * DAY_MS);
    expect(s.cigarettesAvoided).toBe(400 - 2);
    expect(savingsStart(restarted)).toBe(quit);
  });

  it('never goes negative', () => {
    const s = computeSavings(user, [smoke(local(2026, 3, 1, 9), 80)], ms(quit) + DAY_MS);
    expect(s.savedCents).toBe(0);
    expect(s.cigarettesAvoided).toBe(0);
  });
});

describe('habits history keeps past savings consistent', () => {
  const quit = local(2026, 3, 1, 8);
  const priceChange = local(2026, 3, 11, 8);
  const user = makeUser({
    quitDate: quit,
    savingsStartDate: quit,
    smokingBaselinePerDay: 20,
    smoking: {
      cigarettesPerDay: 20,
      yearsSmoking: 10,
      cigarettesPerPack: 20,
      packPriceCents: 1200,
    },
    habitsHistory: [
      { effectiveFrom: quit, cigarettesPerDay: 20, cigarettesPerPack: 20, packPriceCents: 1000 },
      {
        effectiveFrom: priceChange,
        cigarettesPerDay: 20,
        cigarettesPerPack: 20,
        packPriceCents: 1200,
      },
    ],
  });

  it('applies each price to its own period', () => {
    const s = computeSavings(user, [], ms(quit) + 20 * DAY_MS);
    // 10 days at 10 €/day + 10 days at 12 €/day
    expect(s.savedCents).toBe(10 * 1000 + 10 * 1200);
    expect(s.perDayCents).toBe(1200);
  });

  it('values a cigarette at the price that applied when it was smoked', () => {
    const s = computeSavings(user, [smoke(local(2026, 3, 5, 12), 2)], ms(quit) + 20 * DAY_MS);
    expect(s.spentSincePlanCents).toBe(100);
  });

  it('falls back to the current profile when there is no history', () => {
    const plain = makeUser();
    expect(habitsTimeline(plain)).toHaveLength(1);
    expect(habitsAt(habitsTimeline(plain), Date.now()).packPriceCents).toBe(1000);
  });
});

describe('computeSavings (reduction goal)', () => {
  const start = local(2026, 3, 1, 0);
  const reducer = makeUser({
    goal: 'reduce',
    quitDate: undefined,
    reductionTargetPerDay: 10,
    reductionStartDate: start,
    savingsStartDate: start,
  });

  it('counts the difference between the baseline and logged consumption', () => {
    const events = [
      smoke(local(2026, 3, 1, 10), 6),
      smoke(local(2026, 3, 1, 18), 6),
      smoke(local(2026, 3, 2, 10), 8),
    ];
    const s = computeSavings(reducer, events, ms(local(2026, 3, 3, 0)));
    // 2 days * 20 expected - 20 smoked
    expect(s.cigarettesAvoided).toBe(20);
    expect(s.savedCents).toBe(1000);
  });

  it('projects savings from the reduction target, not from full abstinence', () => {
    const s = computeSavings(reducer, [], ms(local(2026, 3, 2)));
    expect(s.projectionOneYearCents).toBe(Math.round(10 * 50 * 365.25));
  });
});

describe('computeReductionStats', () => {
  it('tracks today and days at or under target', () => {
    const start = local(2026, 3, 1, 0);
    const reducer = makeUser({
      goal: 'reduce',
      quitDate: undefined,
      reductionTargetPerDay: 10,
      reductionStartDate: start,
    });
    const events = [
      smoke(local(2026, 3, 1, 10), 12),
      smoke(local(2026, 3, 2, 10), 9),
      smoke(local(2026, 3, 3, 9), 3),
    ];
    const r = computeReductionStats(reducer, events, ms(local(2026, 3, 3, 15)));
    expect(r.todaySmoked).toBe(3);
    expect(r.target).toBe(10);
    expect(r.daysOnPlan).toBe(3);
    expect(r.daysUnderTarget).toBe(2);
  });
});

describe('XP levels', () => {
  it('follows the documented curve', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(300);
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(299)).toBe(2);
    expect(levelFromXp(300)).toBe(3);
  });
  it('reports progress inside the level', () => {
    expect(levelProgress(150)).toEqual({ level: 2, current: 50, needed: 200 });
  });
});

describe('date helpers', () => {
  it('splits durations', () => {
    expect(splitDuration(DAY_MS + 61_000)).toMatchObject({
      days: 1,
      hours: 0,
      minutes: 1,
      seconds: 1,
    });
    expect(splitDuration(-5).totalMs).toBe(0);
  });
  it('uses local calendar days', () => {
    expect(dayKey(new Date(2026, 2, 29, 0, 30))).toBe('2026-03-29');
    expect(dayKey(new Date(2026, 2, 28, 23, 59))).toBe('2026-03-28');
  });
});
