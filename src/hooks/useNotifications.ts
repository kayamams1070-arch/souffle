import { useEffect, useRef } from 'react';
import { useCravingStore, useSettingsStore, useUserStore } from '@/store';
import { applyPlans, installNotificationHandler, moveOutOfQuietHours, planNotifications, scheduleMilestone, getPermissionStatus } from '@/services/notificationService';
import { computeForecast } from '@/services/cravingPredictionService';
import { milestonesFor } from '@/data/healthMilestones';
import { getSmokeFreeSince } from '@/utils/calculations';
import i18n from '@/i18n';
import { milestoneLabel } from '@/components/dashboard/HealthTimeline';

/**
 * Keeps scheduled local notifications in sync with the preferences and the data.
 * Runs on changes only (signature guard) and never schedules without permission.
 */
export function useNotificationSync(): void {
  const settings = useSettingsStore((s) => s.settings);
  const user = useUserStore((s) => s.user);
  const cravings = useCravingStore((s) => s.cravings);
  const smokingEvents = useCravingStore((s) => s.smokingEvents);
  const last = useRef('');
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    installNotificationHandler();
  }, []);

  useEffect(() => {
    const prefs = settings.notifications;
    const forecast = computeForecast(cravings);
    const peakHour = forecast.enough && forecast.peakSlot ? { morning: 8, midday: 12, afternoon: 15, evening: 19, night: 23 }[forecast.peakSlot.slot] : undefined;
    const since = user ? getSmokeFreeSince(user, smokingEvents) : null;
    const signature = JSON.stringify({ prefs, lang: settings.language, peakHour, since, onboarding: user?.onboardingCompleted, substance: user?.smoking.substance });
    if (signature === last.current) return;
    last.current = signature;
    // Runs are chained so two quick preference changes never interleave cancel / schedule.
    queue.current = queue.current.then(async () => {
      if (!prefs.enabled || !user?.onboardingCompleted) {
        await applyPlans([]);
        return;
      }
      const status = await getPermissionStatus();
      if (status !== 'granted') return;
      const t = i18n.getFixedT(settings.language);
      const plans = planNotifications(prefs, settings.language, {
        triggerHour: peakHour,
        triggerLabel: forecast.peakSlot ? t(`forecast.slots.${forecast.peakSlot.slot}`) : undefined,
      });
      await applyPlans(plans);
      if (prefs.categories.milestone && since) {
        const start = new Date(since).getTime();
        for (const m of milestonesFor(user.smoking.substance)) {
          const at = moveOutOfQuietHours(new Date(start + m.afterMinutes * 60_000), prefs);
          if (at.getTime() > Date.now()) {
            await scheduleMilestone(m.id, t('notifications.milestone.title'), t('notifications.milestone.body', { label: milestoneLabel(m, t), title: t(`health.milestones.${m.key}.title`) }), at);
          }
        }
      }
    }).catch(() => undefined);
  }, [settings.notifications, settings.language, cravings, smokingEvents, user]);
}
