import { CANNABIS_TRIGGERS, TRIGGERS, triggersFor } from '@/types';
import { CRAVING_ALTERNATIVES } from '@/data/cravingAlternatives';
import { buildDemoData } from '@/data/demoData';
import { enterDemo, exitDemo, loadDemoIntoStores } from '@/services/dataService';
import { useCravingStore, useUserStore } from '@/store';
import { computeReductionStats, computeSavings, substanceOf } from '@/utils/calculations';
import { local, makeUser, ms, smoke } from './helpers';
import { computeCuditScore, cuditLevel } from '@/utils/cudit';
import { userSchema } from '@/utils/validation';

describe('cannabis triggers', () => {
  it('keeps the tobacco picker unchanged and puts cannabis triggers first otherwise', () => {
    const tobacco = triggersFor('tobacco');
    expect(tobacco.some((t) => CANNABIS_TRIGGERS.includes(t))).toBe(false);
    expect(tobacco).toHaveLength(TRIGGERS.length - CANNABIS_TRIGGERS.length);
    for (const sub of ['cannabis', 'both'] as const) {
      const list = triggersFor(sub);
      expect(list.slice(0, 3)).toEqual([...CANNABIS_TRIGGERS]);
      expect(list[list.length - 1]).toBe('other');
      expect(new Set(list).size).toBe(TRIGGERS.length);
    }
  });

  it('has an alternative for every trigger', () => {
    for (const t of TRIGGERS) expect(CRAVING_ALTERNATIVES[t].trigger).toBe(t);
  });
});

describe('cannabis demo', () => {
  it('builds a valid, coherent fictional cannabis profile', () => {
    for (const lang of ['fr', 'nl', 'en'] as const) {
      const d = buildDemoData(new Date(2026, 3, 20, 12), lang, 'cannabis');
      expect(userSchema.safeParse(d.user).success).toBe(true);
      expect(substanceOf(d.user)).toBe('cannabis');
      const c = d.user.smoking.cannabis!;
      expect(c.cuditScore).toBe(computeCuditScore(c.cuditAnswers!));
      expect(c.cuditLevel).toBe(cuditLevel(c.cuditScore!));
      expect(d.smokingEvents.every((e) => e.kind === 'joint')).toBe(true);
      expect(d.cravings.some((cr) => cr.trigger === 'to_sleep')).toBe(true);
      expect(d.cough).toHaveLength(0);
      expect(computeSavings(d.user, d.smokingEvents, new Date(2026, 3, 20, 12).getTime()).savedCents).toBeGreaterThan(0);
    }
  });

  it('enters, resets and leaves the cannabis demo while keeping the chosen substance', async () => {
    useUserStore.getState().reset();
    await enterDemo('fr', 'cannabis');
    expect(substanceOf(useUserStore.getState().user)).toBe('cannabis');
    useCravingStore.getState().replaceAll({ cravings: [], smokingEvents: [] });
    loadDemoIntoStores('fr');
    expect(substanceOf(useUserStore.getState().user)).toBe('cannabis');
    expect(useCravingStore.getState().cravings.length).toBeGreaterThan(0);
    await exitDemo();
    expect(useUserStore.getState().user).toBeNull();
  });
});

describe('use-free days (reduction goal)', () => {
  // 2026-04-23 is a Thursday: Monday 20, Tuesday 21, Wednesday 22 are finished days.
  const now = ms(local(2026, 4, 23, 15));
  const base = () =>
    makeUser({ goal: 'reduce', reductionTargetPerDay: 2, reductionStartDate: local(2026, 4, 1, 8), useFreeDaysPerWeek: 3 });

  it('counts finished days of the current week without consumption', () => {
    const events = [smoke(local(2026, 4, 21, 20), 1)];
    const s = computeReductionStats(base(), events, now);
    expect(s.useFreeTarget).toBe(3);
    expect(s.useFreeDoneThisWeek).toBe(2); // Monday and Wednesday
    expect(s.useFreeDaysLeftThisWeek).toBe(4); // Thursday to Sunday
    expect(s.todayUseFree).toBe(true);
  });

  it('ignores days before the plan and reports today as used once something is logged', () => {
    const user = { ...base(), reductionStartDate: local(2026, 4, 22, 9) };
    const s = computeReductionStats(user, [smoke(local(2026, 4, 23, 10), 1)], now);
    expect(s.useFreeDoneThisWeek).toBe(1); // only Wednesday is inside the plan
    expect(s.todayUseFree).toBe(false);
  });

  it('is absent when no weekly goal is set and validated between 0 and 7', () => {
    const { useFreeDaysPerWeek: _omit, ...rest } = base();
    expect(computeReductionStats(rest, [], now).useFreeTarget).toBeUndefined();
    expect(userSchema.safeParse({ ...base(), useFreeDaysPerWeek: 8 }).success).toBe(false);
  });

  it('keeps or updates the weekly goal when switching goals', () => {
    useUserStore.getState().setUser(makeUser({ goal: 'quit', quitDate: local(2026, 4, 1, 8) }));
    useUserStore.getState().switchGoal('reduce', { reductionTargetPerDay: 2, useFreeDaysPerWeek: 2 });
    expect(useUserStore.getState().user?.useFreeDaysPerWeek).toBe(2);
    useUserStore.getState().switchGoal('reduce', { reductionTargetPerDay: 1, useFreeDaysPerWeek: 0 });
    expect(useUserStore.getState().user?.useFreeDaysPerWeek).toBeUndefined();
    useUserStore.getState().reset();
  });
});
