import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppButton, AppCard, AppText, Banner, ChipGroup, NumberStepper, Screen, ScreenHeader, SwitchRow } from '@/components/ui';
import { useSettingsStore } from '@/store';
import { getPermissionStatus, requestPermission } from '@/services/notificationService';
import type { NotificationCategory } from '@/types';

const CATEGORIES: NotificationCategory[] = ['workout_reminder', 'encouragement', 'trigger_preparation', 'weekly_summary', 'milestone', 'pact_reminder', 'journal_reminder'];
const DAYS = [1, 2, 3, 4, 5, 6, 0];

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const prefs = useSettingsStore((s) => s.settings.notifications);
  const updateNotifications = useSettingsStore((s) => s.updateNotifications);
  const toggleCategory = useSettingsStore((s) => s.toggleNotificationCategory);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined' | 'checking'>('checking');
  const unsupported = Platform.OS === 'web';

  const refresh = useCallback(async () => {
    setPermission(await getPermissionStatus());
  }, []);

  useEffect(() => {
    let mounted = true;
    getPermissionStatus().then((s) => {
      if (mounted) setPermission(s);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const enable = async (value: boolean) => {
    if (!value) {
      updateNotifications({ enabled: false });
      return;
    }
    const granted = permission === 'granted' || (await requestPermission());
    await refresh();
    updateNotifications({ enabled: granted });
  };

  return (
    <Screen>
      <ScreenHeader title={t('settings.notifications.title')} subtitle={t('settings.notifications.subtitle')} />
      {unsupported ? <Banner text={t('settings.notifications.webUnsupported')} tone="warm" /> : null}
      <AppCard>
        <SwitchRow label={t('settings.notifications.enable')} description={t('settings.notifications.enableHint')} value={prefs.enabled} onChange={(v) => void enable(v)} disabled={unsupported} />
        {permission === 'denied' ? (
          <View style={{ gap: 8, marginTop: 8 }}>
            <Banner text={t('settings.notifications.denied')} tone="warm" />
            {Platform.OS !== 'web' ? <AppButton label={t('settings.notifications.openSettings')} variant="secondary" size="sm" onPress={() => void Linking.openSettings()} /> : null}
          </View>
        ) : null}
      </AppCard>
      {prefs.enabled ? (
        <>
          <AppCard title={t('settings.notifications.categories')}>
            {CATEGORIES.map((c) => (
              <SwitchRow key={c} label={t(`settings.notifications.category.${c}`)} description={t(`settings.notifications.categoryHint.${c}`)} value={prefs.categories[c]} onChange={(v) => toggleCategory(c, v)} />
            ))}
          </AppCard>
          <AppCard title={t('settings.notifications.quietHours')} subtitle={t('settings.notifications.quietHoursHint')}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <NumberStepper label={t('settings.notifications.quietFrom')} value={prefs.quietStartHour} onChange={(v) => updateNotifications({ quietStartHour: v })} min={0} max={23} unit={t('units.h')} />
              </View>
              <View style={{ flex: 1 }}>
                <NumberStepper label={t('settings.notifications.quietTo')} value={prefs.quietEndHour} onChange={(v) => updateNotifications({ quietEndHour: v })} min={0} max={23} unit={t('units.h')} />
              </View>
            </View>
          </AppCard>
          {prefs.categories.workout_reminder ? (
            <AppCard title={t('settings.notifications.workoutTitle')}>
              <NumberStepper label={t('settings.notifications.hour')} value={prefs.workoutReminderHour} onChange={(v) => updateNotifications({ workoutReminderHour: v })} min={0} max={23} unit={t('units.h')} />
              <View style={{ marginTop: 12 }}>
                <ChipGroup
                  label={t('settings.notifications.days')}
                  options={DAYS.map((d) => ({ value: d, label: t(`weekdaysShort.${d}`) }))}
                  value={prefs.workoutReminderDays}
                  multiple
                  compact
                  onChange={(d) =>
                    updateNotifications({
                      workoutReminderDays: prefs.workoutReminderDays.includes(d) ? prefs.workoutReminderDays.filter((x) => x !== d) : [...prefs.workoutReminderDays, d].sort(),
                    })
                  }
                />
              </View>
            </AppCard>
          ) : null}
          {prefs.categories.journal_reminder ? (
            <AppCard title={t('settings.notifications.journalTitle')}>
              <NumberStepper label={t('settings.notifications.hour')} value={prefs.journalReminderHour} onChange={(v) => updateNotifications({ journalReminderHour: v })} min={0} max={23} unit={t('units.h')} />
            </AppCard>
          ) : null}
        </>
      ) : null}
      <AppText variant="caption" tone="secondary">
        {t('settings.notifications.bestEffort')}
      </AppText>
    </Screen>
  );
}
