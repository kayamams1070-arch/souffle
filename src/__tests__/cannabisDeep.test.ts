import { CANNABIS_TRIGGERS, TRIGGERS, triggersFor } from '@/types';
import { CRAVING_ALTERNATIVES } from '@/data/cravingAlternatives';
import { buildDemoData } from '@/data/demoData';
import { enterDemo, exitDemo, loadDemoIntoStores } from '@/services/dataService';
import { useCravingStore, useUserStore } from '@/store';
import { computeSavings, substanceOf } from '@/utils/calculations';
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
