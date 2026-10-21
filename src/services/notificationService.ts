/**
 * Local notifications only (no push server). Every scheduling call goes through
 * `syncNotifications`, which cancels the previous set and re-schedules according to the
 * current preferences, so toggling a category or changing hours never leaves stale
 * notifications behind. Delivery is best effort: the OS may delay or drop notifications
 * and the app never promises exact delivery.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Language, NotificationPreferences } from '@/types';
import i18n from '@/i18n';

const CHANNEL_ID = 'souffle-default';
let handlerInstalled = false;

export function installNotificationHandler(): void {
  if (handlerInstalled) return;
  handlerInstalled = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // Not available (web / tests)
  }
}

export async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Souffle',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 150],
    });
  } catch {
    // ignore
  }
}

export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  try {
    const s = await Notifications.getPermissionsAsync();
    if (s.granted) return 'granted';
    return s.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function requestPermission(): Promise<boolean> {
  try {
    const s = await Notifications.requestPermissionsAsync();
    return Boolean(s.granted);
  } catch {
    return false;
  }
}

/** Whether an hour (0-23) falls inside the allowed window (outside quiet hours). */
export function isHourAllowed(hour: number, prefs: Pick<NotificationPreferences, 'quietStartHour' | 'quietEndHour'>): boolean {
  const { quietStartHour: start, quietEndHour: end } = prefs;
  if (start === end) return true;
  if (start < end) return !(hour >= start && hour < end);
  // Quiet window crossing midnight, e.g. 22 -> 8
  return !(hour >= start || hour < end);
}

/** Clamps an hour into the allowed window (returns the first allowed hour after quiet time). */
export function clampHour(hour: number, prefs: Pick<NotificationPreferences, 'quietStartHour' | 'quietEndHour'>): number {
  if (isHourAllowed(hour, prefs)) return hour;
  return prefs.quietEndHour % 24;
}

export interface PlannedNotification {
  id: string;
  title: string;
  body: string;
  trigger: Notifications.NotificationTriggerInput;
}

/** Builds the list of notifications to schedule from the preferences (pure, testable). */
export function planNotifications(prefs: NotificationPreferences, language: Language, options: { triggerHour?: number; triggerLabel?: string } = {}): PlannedNotification[] {
  if (!prefs.enabled) return [];
  const t = i18n.getFixedT(language);
  const plans: PlannedNotification[] = [];
  const channel = Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {};
  if (prefs.categories.workout_reminder) {
    const hour = clampHour(prefs.workoutReminderHour, prefs);
    for (const day of prefs.workoutReminderDays) {
      plans.push({
        id: `workout_${day}`,
        title: t('notifications.workout.title'),
        body: t('notifications.workout.body'),
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: day + 1, hour, minute: 0, ...channel },
      });
    }
  }
  if (prefs.categories.encouragement) {
    const hour = clampHour(10, prefs);
    plans.push({
      id: 'encouragement_weekly',
      title: t('notifications.encouragement.title'),
      body: t('notifications.encouragement.body'),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 3, hour, minute: 30, ...channel },
    });
  }
  if (prefs.categories.weekly_summary) {
    const hour = clampHour(19, prefs);
    plans.push({
      id: 'weekly_summary',
      title: t('notifications.weekly.title'),
      body: t('notifications.weekly.body'),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour, minute: 0, ...channel },
    });
  }
  if (prefs.categories.pact_reminder) {
    const hour = clampHour(9, prefs);
    plans.push({
      id: 'pact_reminder',
      title: t('notifications.pact.title'),
      body: t('notifications.pact.body'),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 6, hour, minute: 0, ...channel },
    });
  }
  if (prefs.categories.journal_reminder) {
    const hour = clampHour(prefs.journalReminderHour, prefs);
    plans.push({
      id: 'journal_reminder',
      title: t('notifications.journal.title'),
      body: t('notifications.journal.body'),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0, ...channel },
    });
  }
  if (prefs.categories.trigger_preparation && options.triggerHour !== undefined && options.triggerLabel) {
    const hour = clampHour(Math.max(0, options.triggerHour - 1), prefs);
    plans.push({
      id: 'trigger_preparation',
      title: t('notifications.trigger.title'),
      body: t('notifications.trigger.body', { slot: options.triggerLabel }),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 30, ...channel },
    });
  }
  return plans;
}

/** Cancels every scheduled notification and re-schedules according to `plans`. */
export async function applyPlans(plans: PlannedNotification[]): Promise<{ scheduled: number; error?: string }> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (plans.length === 0) return { scheduled: 0 };
    await ensureChannel();
    let scheduled = 0;
    for (const plan of plans) {
      await Notifications.scheduleNotificationAsync({
        identifier: plan.id,
        content: { title: plan.title, body: plan.body, sound: false },
        trigger: plan.trigger,
      });
      scheduled += 1;
    }
    return { scheduled };
  } catch (error) {
    return { scheduled: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function cancelAll(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

/** One-off milestone notification (e.g. a health milestone reached while the app is closed). */
export async function scheduleMilestone(id: string, title: string, body: string, at: Date): Promise<void> {
  if (at.getTime() <= Date.now()) return;
  try {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: `milestone_${id}`,
      content: { title, body, sound: false },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}) },
    });
  } catch {
    // ignore
  }
}
