import { clampHour, isHourAllowed, planNotifications } from '@/services/notificationService';
import { DEFAULT_NOTIFICATIONS } from '@/store';
import { initI18n } from '@/i18n';

beforeAll(() => {
  initI18n('fr');
});

describe('quiet hours', () => {
  const prefs = { quietStartHour: 22, quietEndHour: 8 };
  it('handles a window crossing midnight', () => {
    expect(isHourAllowed(21, prefs)).toBe(true);
    expect(isHourAllowed(22, prefs)).toBe(false);
    expect(isHourAllowed(3, prefs)).toBe(false);
    expect(isHourAllowed(8, prefs)).toBe(true);
  });
  it('moves a reminder out of quiet hours', () => {
    expect(clampHour(23, prefs)).toBe(8);
    expect(clampHour(18, prefs)).toBe(18);
  });
});

describe('planNotifications', () => {
  it('schedules nothing when notifications are disabled', () => {
    expect(planNotifications({ ...DEFAULT_NOTIFICATIONS, enabled: false }, 'fr')).toEqual([]);
  });

  it('respects each category toggle', () => {
    const all = planNotifications({ ...DEFAULT_NOTIFICATIONS, enabled: true }, 'fr', {
      triggerHour: 15,
      triggerLabel: 'après-midi',
    });
    const ids = all.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'workout_1',
        'workout_3',
        'workout_5',
        'encouragement_weekly',
        'weekly_summary',
        'trigger_preparation',
      ])
    );
    expect(ids).not.toContain('journal_reminder');
    const none = planNotifications(
      {
        ...DEFAULT_NOTIFICATIONS,
        enabled: true,
        categories: {
          workout_reminder: false,
          encouragement: false,
          trigger_preparation: false,
          weekly_summary: false,
          milestone: false,
          pact_reminder: false,
          journal_reminder: false,
        },
      },
      'fr',
      { triggerHour: 15, triggerLabel: 'x' }
    );
    expect(none).toEqual([]);
  });

  it('never schedules during quiet hours', () => {
    const plans = planNotifications(
      {
        ...DEFAULT_NOTIFICATIONS,
        enabled: true,
        workoutReminderHour: 23,
        journalReminderHour: 6,
        categories: { ...DEFAULT_NOTIFICATIONS.categories, journal_reminder: true },
      },
      'fr'
    );
    for (const p of plans) {
      const hour = (p.trigger as { hour?: number }).hour;
      if (hour !== undefined) expect(isHourAllowed(hour, DEFAULT_NOTIFICATIONS)).toBe(true);
    }
  });
});
