import {
  canStartFreeze,
  canUseShield,
  computeCurrentStreak,
  computeStreakInfo,
  firstCountableDay,
  FREEZE_MAX_DAYS,
  shieldAvailability,
  totalSmokeFreeDays,
} from '@/utils/streaks';
import { DAY_MS } from '@/utils/dates';
import type { RewardState } from '@/types';
import { local, makeUser, ms, smoke } from './helpers';

const noRewards = (): RewardState => ({
  xp: 0,
  events: [],
  badges: [],
  shieldUses: [],
  freezes: [],
  bestStreakDays: 0,
});

describe('firstCountableDay', () => {
  it('starts the day after a quit during the day (partial day not counted)', () => {
    expect(firstCountableDay(makeUser({ quitDate: local(2026, 4, 10, 15) }))).toBe('2026-04-11');
  });
  it('counts the quit day itself when quitting exactly at midnight', () => {
    expect(firstCountableDay(makeUser({ quitDate: local(2026, 4, 10, 0) }))).toBe('2026-04-10');
  });
  it('is null for the reduction goal', () => {
    expect(firstCountableDay(makeUser({ goal: 'reduce', quitDate: undefined }))).toBeNull();
  });
});

describe('computeCurrentStreak', () => {
  const user = makeUser({ quitDate: local(2026, 4, 1, 9) });

  it('counts complete smoke-free days (today excluded until it ends)', () => {
    // First countable day = 2 April; now = 6 April 10:00 -> 2,3,4,5 = 4 days
    expect(computeCurrentStreak(user, [], noRewards(), ms(local(2026, 4, 6, 10)))).toBe(4);
  });

  it('drops to 0 immediately when a cigarette is logged today', () => {
    const events = [smoke(local(2026, 4, 6, 9))];
    expect(computeCurrentStreak(user, events, noRewards(), ms(local(2026, 4, 6, 10)))).toBe(0);
  });

  it('restarts after a past cigarette day', () => {
    const events = [smoke(local(2026, 4, 3, 20))];
    // 4 and 5 April count
    expect(computeCurrentStreak(user, events, noRewards(), ms(local(2026, 4, 6, 10)))).toBe(2);
  });

  it('keeps the streak when a shield protects the day', () => {
    const events = [smoke(local(2026, 4, 3, 20))];
    const rewards = {
      ...noRewards(),
      shieldUses: [{ id: 's1', usedAt: local(2026, 4, 3, 21), protectedDay: '2026-04-03' }],
    };
    expect(computeCurrentStreak(user, events, rewards, ms(local(2026, 4, 6, 10)))).toBe(4);
  });

  it('skips frozen days without counting or breaking them', () => {
    const events = [smoke(local(2026, 4, 3, 20))];
    const rewards = {
      ...noRewards(),
      freezes: [
        { id: 'f1', startDay: '2026-04-03', endDay: '2026-04-04', reason: 'illness' as const },
      ],
    };
    // 2 April counts, 3-4 frozen (cigarette ignored), 5 counts -> 2
    expect(computeCurrentStreak(user, events, rewards, ms(local(2026, 4, 6, 10)))).toBe(2);
  });

  it('crosses the spring DST change without losing or duplicating a day', () => {
    const u = makeUser({ quitDate: local(2026, 3, 27, 9) });
    // Countable: 28, 29 (23h), 30 March -> 3 days on 31 March
    expect(computeCurrentStreak(u, [], noRewards(), ms(local(2026, 3, 31, 8)))).toBe(3);
  });
});

describe('shield', () => {
  it('is available when never used', () => {
    expect(shieldAvailability([]).available).toBe(true);
  });

  it('has a 7-day cooldown after use', () => {
    const used = local(2026, 4, 1, 10);
    const uses = [{ id: 's', usedAt: used, protectedDay: '2026-04-01' }];
    expect(shieldAvailability(uses, ms(used) + 6 * DAY_MS).available).toBe(false);
    expect(shieldAvailability(uses, ms(used) + 7 * DAY_MS).available).toBe(true);
  });

  it('cannot protect a day older than yesterday (no arbitrary retroactive use)', () => {
    const now = ms(local(2026, 4, 10, 12));
    expect(canUseShield(noRewards(), '2026-04-10', now)).toEqual({ ok: true });
    expect(canUseShield(noRewards(), '2026-04-09', now)).toEqual({ ok: true });
    expect(canUseShield(noRewards(), '2026-04-08', now)).toEqual({ ok: false, reason: 'too_old' });
  });

  it('cannot be consumed twice for the same day or during cooldown', () => {
    const rewards = {
      ...noRewards(),
      shieldUses: [{ id: 's', usedAt: local(2026, 4, 10, 11), protectedDay: '2026-04-10' }],
    };
    const now = ms(local(2026, 4, 10, 12));
    expect(canUseShield(rewards, '2026-04-10', now)).toEqual({ ok: false, reason: 'already' });
    expect(canUseShield(rewards, '2026-04-09', now)).toEqual({ ok: false, reason: 'cooldown' });
  });
});

describe('freeze (illness / travel)', () => {
  const now = ms(local(2026, 4, 10, 12));
  it('accepts 1 to 14 days starting today or later', () => {
    expect(canStartFreeze([], '2026-04-10', 3, now)).toEqual({ ok: true });
    expect(canStartFreeze([], '2026-04-10', FREEZE_MAX_DAYS, now)).toEqual({ ok: true });
    expect(canStartFreeze([], '2026-04-10', FREEZE_MAX_DAYS + 1, now)).toEqual({
      ok: false,
      reason: 'too_long',
    });
    expect(canStartFreeze([], '2026-04-09', 2, now)).toEqual({ ok: false, reason: 'past' });
  });
  it('refuses overlapping or concurrent freezes', () => {
    const freezes = [
      { id: 'f', startDay: '2026-04-10', endDay: '2026-04-12', reason: 'travel' as const },
    ];
    expect(canStartFreeze(freezes, '2026-04-10', 2, now).ok).toBe(false);
  });
});

describe('streak info and best record', () => {
  it('keeps the historical best after a relapse', () => {
    const user = makeUser({ quitDate: local(2026, 4, 1, 9) });
    const rewards = { ...noRewards(), bestStreakDays: 12 };
    const info = computeStreakInfo(
      user,
      [smoke(local(2026, 4, 6, 9))],
      rewards,
      ms(local(2026, 4, 6, 10))
    );
    expect(info.currentDays).toBe(0);
    expect(info.bestDays).toBe(12);
  });
});

describe('totalSmokeFreeDays', () => {
  it('counts every smoke-free complete day, not only consecutive ones', () => {
    const user = makeUser({
      quitDate: local(2026, 4, 1, 9),
      savingsStartDate: local(2026, 4, 1, 9),
    });
    const events = [smoke(local(2026, 4, 3, 20))];
    // Days 2..9 April = 8 days, minus 3 April = 7
    expect(totalSmokeFreeDays(user, events, ms(local(2026, 4, 10, 10)))).toBe(7);
  });

  it('is not erased by a new quit date after a relapse', () => {
    const first = local(2026, 4, 1, 9);
    const user = makeUser({ quitDate: local(2026, 4, 8, 9), savingsStartDate: first });
    const events = [smoke(local(2026, 4, 8, 8))];
    // 2..7 April (6 days) + 9 April = 7
    expect(totalSmokeFreeDays(user, events, ms(local(2026, 4, 10, 10)))).toBe(7);
  });

  it('never claims abstinence in reduction mode', () => {
    const reducer = makeUser({ goal: 'reduce', quitDate: undefined });
    expect(totalSmokeFreeDays(reducer, [], Date.now())).toBe(0);
  });
});
