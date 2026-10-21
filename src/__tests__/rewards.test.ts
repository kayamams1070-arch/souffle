import { useRewardStore } from '@/store';
import { evaluateBadges, hasComeback, hasRegularWeek, xpEventId } from '@/services/rewardService';
import { XP_RULES } from '@/utils/constants';
import { BADGES } from '@/data/badges';
import type { RewardState } from '@/types';
import { craving, local, makeUser, ms, session, smoke } from './helpers';

const empty = (): RewardState => ({
  xp: 0,
  events: [],
  badges: [],
  shieldUses: [],
  freezes: [],
  bestStreakDays: 0,
});

beforeEach(() => {
  useRewardStore.getState().reset();
});

describe('XP (idempotent)', () => {
  it('awards XP once per event id, even on repeated taps or re-opening a session', () => {
    const s = useRewardStore.getState();
    expect(s.awardXp(xpEventId.workout('ws_1'), 'workout_completed')).toBe(
      XP_RULES.workout_completed
    );
    expect(useRewardStore.getState().awardXp(xpEventId.workout('ws_1'), 'workout_completed')).toBe(
      0
    );
    expect(useRewardStore.getState().awardXp(xpEventId.workout('ws_1'), 'workout_completed')).toBe(
      0
    );
    expect(useRewardStore.getState().xp).toBe(30);
    expect(useRewardStore.getState().events).toHaveLength(1);
  });

  it('uses the documented scale', () => {
    expect(XP_RULES).toMatchObject({
      workout_completed: 30,
      craving_overcome: 15,
      journal_entry: 5,
      victory: 10,
    });
    const s = useRewardStore.getState();
    s.awardXp(xpEventId.craving('c1'), 'craving_overcome');
    useRewardStore.getState().awardXp(xpEventId.journal('j1'), 'journal_entry');
    useRewardStore.getState().awardXp(xpEventId.victory('v1'), 'victory');
    expect(useRewardStore.getState().xp).toBe(15 + 5 + 10);
  });
});

describe('badges', () => {
  it('stay unlocked once acquired (unlockBadges only adds)', () => {
    expect(useRewardStore.getState().unlockBadges(['workouts_1', 'cravings_1'])).toEqual([
      'workouts_1',
      'cravings_1',
    ]);
    expect(useRewardStore.getState().unlockBadges(['workouts_1'])).toEqual([]);
    // Evaluating with fewer facts never removes anything: the store has no remove action.
    useRewardStore.getState().unlockBadges([]);
    expect(useRewardStore.getState().badges.map((b) => b.id)).toEqual(['workouts_1', 'cravings_1']);
  });

  it('every badge has an icon and a category', () => {
    for (const b of BADGES) {
      expect(b.icon).toBeTruthy();
      expect(['smoke_free', 'sport', 'craving', 'consistency']).toContain(b.category);
    }
  });

  it('evaluates thresholds from facts', () => {
    const user = makeUser({
      quitDate: local(2026, 4, 1, 9),
      personalPactSignedAt: local(2026, 4, 1, 9),
    });
    const sessions = Array.from({ length: 10 }, (_, i) => session(local(2026, 4, 2 + i, 18)));
    const cravings = Array.from({ length: 10 }, (_, i) =>
      craving(local(2026, 4, 2 + i, 9), { outcome: 'passed' })
    );
    const ids = evaluateBadges({
      user,
      cravings,
      smokingEvents: [],
      sessions,
      rewards: empty(),
      now: ms(local(2026, 4, 9, 12)),
    });
    expect(ids).toEqual(
      expect.arrayContaining([
        'smoke_free_1d',
        'smoke_free_1w',
        'workouts_1',
        'workouts_10',
        'cravings_1',
        'cravings_10',
        'regular_week',
        'pact_signed',
      ])
    );
    expect(ids).not.toContain('smoke_free_1m');
    expect(ids).not.toContain('workouts_50');
  });

  it('keeps smoke-free badges after a relapse thanks to the best streak record', () => {
    const user = makeUser({ quitDate: local(2026, 4, 1, 9) });
    const ids = evaluateBadges({
      user,
      cravings: [],
      smokingEvents: [smoke(local(2026, 4, 9, 9))],
      sessions: [],
      rewards: { ...empty(), bestStreakDays: 8 },
      now: ms(local(2026, 4, 9, 12)),
    });
    expect(ids).toEqual(expect.arrayContaining(['smoke_free_1d', 'smoke_free_1w']));
  });

  it('a regular week needs 3 sessions in the same Monday-based week', () => {
    // 6 April 2026 is a Monday
    expect(
      hasRegularWeek([
        session(local(2026, 4, 6, 9)),
        session(local(2026, 4, 8, 9)),
        session(local(2026, 4, 12, 9)),
      ])
    ).toBe(true);
    expect(
      hasRegularWeek([
        session(local(2026, 4, 5, 9)),
        session(local(2026, 4, 6, 9)),
        session(local(2026, 4, 8, 9)),
      ])
    ).toBe(false);
  });

  it('comeback = an action after a relapse', () => {
    const relapse = smoke(local(2026, 4, 5, 20), 1, { decision: 'continue_quit' });
    expect(hasComeback([relapse], [], [])).toBe(false);
    expect(hasComeback([relapse], [session(local(2026, 4, 6, 9))], [])).toBe(true);
    expect(hasComeback([relapse], [], [craving(local(2026, 4, 6, 9), { outcome: 'passed' })])).toBe(
      true
    );
    // Reduction logs are not relapses
    expect(
      hasComeback(
        [smoke(local(2026, 4, 5, 20), 1, { decision: 'reduction_log' })],
        [session(local(2026, 4, 6, 9))],
        []
      )
    ).toBe(false);
  });
});

describe('shield store action', () => {
  it('logs each use with the protected day', () => {
    useRewardStore.getState().useShield('2026-04-10');
    const uses = useRewardStore.getState().shieldUses;
    expect(uses).toHaveLength(1);
    expect(uses[0]!.protectedDay).toBe('2026-04-10');
    expect(uses[0]!.usedAt).toBeTruthy();
  });

  it('records only an improved best streak', () => {
    useRewardStore.getState().recordBestStreak(5);
    useRewardStore.getState().recordBestStreak(3);
    expect(useRewardStore.getState().bestStreakDays).toBe(5);
  });
});
