import type { User } from '@/types';
import {
  computeReductionStats,
  computeSavings,
  dailyCostCents,
  habitsTimeline,
  pricePerJointCents,
  substanceOf,
  unitPriceCents,
  unitsPerDay,
} from '@/utils/calculations';
import { userSchema } from '@/utils/validation';
import { useUserStore } from '@/store';
import { local, makeUser, ms, smoke } from './helpers';

const DAY = 24 * 3600 * 1000;

function cannabisUser(overrides: Partial<User> = {}): User {
  return makeUser({
    smoking: {
      substance: 'cannabis',
      cigarettesPerDay: 0,
      yearsSmoking: 0,
      cigarettesPerPack: 20,
      packPriceCents: 0,
      cannabis: { jointsPerDay: 4, gramsPerJoint: 0.25, pricePerGramCents: 1000, yearsUsing: 6 },
    },
    smokingBaselinePerDay: 4,
    ...overrides,
  });
}

function mixedUser(overrides: Partial<User> = {}): User {
  return makeUser({
    smoking: {
      substance: 'both',
      cigarettesPerDay: 10,
      yearsSmoking: 8,
      cigarettesPerPack: 20,
      packPriceCents: 1000,
      cannabis: { jointsPerDay: 2, gramsPerJoint: 0.5, pricePerGramCents: 1000, yearsUsing: 5, mixedWithTobacco: true },
    },
    smokingBaselinePerDay: 12,
    ...overrides,
  });
}

describe('cannabis and mixed profiles', () => {
  it('defaults older profiles to tobacco', () => {
    expect(substanceOf(makeUser())).toBe('tobacco');
    expect(substanceOf(cannabisUser())).toBe('cannabis');
  });

  it('prices a joint from grams and price per gram', () => {
    expect(pricePerJointCents(0.25, 1000)).toBe(250);
    expect(pricePerJointCents(undefined, 1000)).toBe(0);
    expect(pricePerJointCents(0.3, 0)).toBe(0);
  });

  it('builds the habits snapshot for each substance', () => {
    const [c] = habitsTimeline(cannabisUser());
    expect(c).toMatchObject({ cigarettesPerDay: 0, jointsPerDay: 4, gramsPerJoint: 0.25, pricePerGramCents: 1000 });
    expect(unitsPerDay(c!)).toBe(4);
    expect(dailyCostCents(c!)).toBe(1000); // 4 joints × 0.25 g × 10 €

    const [m] = habitsTimeline(mixedUser());
    expect(unitsPerDay(m!)).toBe(12);
    // 10 cigarettes × 0.50 € + 2 joints × 5 € = 15 €
    expect(dailyCostCents(m!)).toBe(1500);
    expect(unitPriceCents(m!, 'cigarette')).toBe(50);
    expect(unitPriceCents(m!, 'joint')).toBe(500);
    expect(unitPriceCents(m!)).toBe(125); // average
  });

  it('computes cannabis savings and deducts logged joints', () => {
    const user = cannabisUser();
    const now = new Date(user.quitDate!).getTime() + 10 * DAY;
    const clean = computeSavings(user, [], now);
    expect(clean.perDayCents).toBe(1000);
    expect(clean.savedCents).toBe(10_000);
    expect(clean.cigarettesAvoided).toBe(40);

    const slip = computeSavings(user, [smoke(local(2026, 3, 5, 21), 1, { kind: 'joint' })], now);
    expect(slip.savedCents).toBe(10_000 - 250);
    expect(slip.spentSincePlanCents).toBe(250);
  });

  it('uses the exact price of what was logged in a mixed profile', () => {
    const user = mixedUser();
    const now = new Date(user.quitDate!).getTime() + 2 * DAY;
    const base = computeSavings(user, [], now);
    expect(base.savedCents).toBe(3000);
    const withCig = computeSavings(user, [smoke(local(2026, 3, 2, 10), 1, { kind: 'cigarette' })], now);
    const withJoint = computeSavings(user, [smoke(local(2026, 3, 2, 10), 1, { kind: 'joint' })], now);
    expect(withCig.savedCents).toBe(3000 - 50);
    expect(withJoint.savedCents).toBe(3000 - 500);
  });

  it('reduction counts cigarettes and joints together', () => {
    const user = mixedUser({
      goal: 'reduce',
      quitDate: undefined,
      reductionTargetPerDay: 6,
      reductionStartDate: local(2026, 3, 1, 8),
    });
    const now = ms(local(2026, 3, 1, 22));
    const events = [
      smoke(local(2026, 3, 1, 9), 3, { kind: 'cigarette' }),
      smoke(local(2026, 3, 1, 20), 1, { kind: 'joint' }),
    ];
    const stats = computeReductionStats(user, events, now);
    expect(stats.baseline).toBe(12);
    expect(stats.todaySmoked).toBe(4);
    expect(stats.daysUnderTarget).toBe(1);
    // Avoidable per day: (12 - 6) units at the average unit price (1.25 €).
    expect(computeSavings(user, events, now).projectionOneYearCents).toBe(Math.round(6 * 125 * 365.25));
  });

  it('validates cannabis profiles and keeps tobacco profiles valid', () => {
    expect(userSchema.safeParse(cannabisUser()).success).toBe(true);
    expect(userSchema.safeParse(mixedUser()).success).toBe(true);
    expect(userSchema.safeParse(makeUser()).success).toBe(true);
    const bad = cannabisUser();
    bad.smoking.cannabis!.gramsPerJoint = 0;
    expect(userSchema.safeParse(bad).success).toBe(false);
  });

  it('versions cannabis habits so a price change never rewrites past savings', () => {
    const user = cannabisUser({ createdAt: local(2026, 3, 1, 8), quitDate: local(2026, 3, 1, 8) });
    useUserStore.getState().setUser(user);
    jest.useFakeTimers().setSystemTime(ms(local(2026, 3, 11, 8)));
    try {
      useUserStore.getState().updateHabits({
        cigarettesPerDay: 0,
        cigarettesPerPack: 20,
        packPriceCents: 0,
        jointsPerDay: 4,
        gramsPerJoint: 0.25,
        pricePerGramCents: 2000,
      });
      const updated = useUserStore.getState().user!;
      expect(updated.smoking.cannabis!.pricePerGramCents).toBe(2000);
      expect(updated.smokingBaselinePerDay).toBe(4);
      const later = ms(local(2026, 3, 21, 8));
      // 10 days at 10 €/day, then 10 days at 20 €/day.
      expect(computeSavings(updated, [], later).savedCents).toBe(10 * 1000 + 10 * 2000);
    } finally {
      jest.useRealTimers();
      useUserStore.getState().reset();
    }
  });
});

describe('CUDIT-R', () => {
  // Imported lazily to keep this block self-contained.
  const { computeCuditScore, cuditLevel, CUDIT_QUESTIONS, CUDIT_MAX_SCORE } = jest.requireActual('@/utils/cudit') as typeof import('@/utils/cudit');

  it('follows the published scoring (0-4 per item, item 8 = 0/2/4, total 0-32)', () => {
    expect(CUDIT_QUESTIONS).toHaveLength(8);
    expect(CUDIT_QUESTIONS[7]!.points).toEqual([0, 2, 4]);
    expect(computeCuditScore(CUDIT_QUESTIONS.map(() => 0))).toBe(0);
    expect(computeCuditScore(CUDIT_QUESTIONS.map((q) => q.points.length - 1))).toBe(CUDIT_MAX_SCORE);
    expect(CUDIT_MAX_SCORE).toBe(32);
    // Item 8 "yes, during the past 6 months" is worth 4 points.
    expect(computeCuditScore([0, 0, 0, 0, 0, 0, 0, 2])).toBe(4);
    // Invalid indexes are ignored instead of crashing.
    expect(computeCuditScore([9, -1])).toBe(0);
  });

  it('uses the 8 / 12 cut-offs', () => {
    expect(cuditLevel(7)).toBe('low');
    expect(cuditLevel(8)).toBe('hazardous');
    expect(cuditLevel(11)).toBe('hazardous');
    expect(cuditLevel(12)).toBe('possible_disorder');
  });
});

describe('health timelines per substance', () => {
  const { milestonesFor, milestoneStatus, CANNABIS_MILESTONES, TOBACCO_MILESTONES } = jest.requireActual('@/data/healthMilestones') as typeof import('@/data/healthMilestones');
  const { HEALTH_SOURCES } = jest.requireActual('@/utils/constants') as typeof import('@/utils/constants');

  it('picks the right timeline and merges both in time order', () => {
    expect(milestonesFor('tobacco')).toBe(TOBACCO_MILESTONES);
    expect(milestonesFor('cannabis')).toBe(CANNABIS_MILESTONES);
    const both = milestonesFor('both');
    expect(both).toHaveLength(TOBACCO_MILESTONES.length + CANNABIS_MILESTONES.length);
    expect(both.map((m) => m.afterMinutes)).toEqual([...both.map((m) => m.afterMinutes)].sort((a, b) => a - b));
    expect(new Set(both.map((m) => m.id)).size).toBe(both.length);
  });

  it('every cannabis milestone cites a cannabis source', () => {
    for (const m of CANNABIS_MILESTONES) {
      expect(m.substance).toBe('cannabis');
      expect(m.sourceIds.length).toBeGreaterThan(0);
      for (const id of m.sourceIds) expect(HEALTH_SOURCES[id]?.substance).toBe('cannabis');
    }
  });

  it('reports reached and next milestones for cannabis', () => {
    const s = milestoneStatus(3 * 24 * 60, 'cannabis');
    expect(s.reached.map((m) => m.id)).toEqual(['c1d', 'c2d']);
    expect(s.next?.id).toBe('c1w');
  });
});
