import React, { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppButton, AppCard, AppText, Banner, ChipGroup, Screen, ScreenHeader, SwitchRow } from '@/components/ui';
import { useSettingsStore } from '@/store';
import { isHapticsSupported } from '@/services/hapticService';
import type { FontScale, ThemeMode } from '@/types';

export default function AccessibilityScreen() {
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (mounted) setSystemReduceMotion(v);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Screen>
      <ScreenHeader title={t('settings.accessibility.title')} subtitle={t('settings.accessibility.subtitle')} />
      <AppCard title={t('settings.theme.title')}>
        <ChipGroup<ThemeMode>
          options={[
            { value: 'system', label: t('settings.theme.system'), icon: 'phone-portrait-outline' },
            { value: 'light', label: t('settings.theme.light'), icon: 'sunny-outline' },
            { value: 'dark', label: t('settings.theme.dark'), icon: 'moon-outline' },
          ]}
          value={settings.theme}
          onChange={(theme) => update({ theme })}
        />
      </AppCard>
      <AppCard title={t('settings.fontSize.title')}>
        <ChipGroup<FontScale>
          options={[
            { value: 'normal', label: t('settings.fontSize.normal') },
            { value: 'large', label: t('settings.fontSize.large') },
            { value: 'xlarge', label: t('settings.fontSize.xlarge') },
          ]}
          value={settings.fontScale}
          onChange={(fontScale) => update({ fontScale })}
        />
        <AppText style={{ marginTop: 10 }}>{t('settings.fontSize.preview')}</AppText>
      </AppCard>
      <AppCard>
        <SwitchRow label={t('settings.highContrast')} description={t('settings.highContrastHint')} value={settings.highContrast} onChange={(highContrast) => update({ highContrast })} />
        <SwitchRow label={t('settings.reduceMotion')} description={t('settings.reduceMotionHint')} value={settings.reduceMotion} onChange={(reduceMotion) => update({ reduceMotion })} />
        <SwitchRow
          label={t('settings.haptics')}
          description={isHapticsSupported() ? t('settings.hapticsHint') : t('settings.hapticsUnavailable')}
          value={settings.hapticsEnabled}
          onChange={(hapticsEnabled) => update({ hapticsEnabled })}
        />
        <SwitchRow label={t('settings.voice')} description={t('settings.voiceHint')} value={settings.voiceGuidanceEnabled} onChange={(voiceGuidanceEnabled) => update({ voiceGuidanceEnabled })} />
        <SwitchRow label={t('settings.forecast')} description={t('settings.forecastHint')} value={settings.cravingForecastEnabled} onChange={(cravingForecastEnabled) => update({ cravingForecastEnabled })} />
      </AppCard>
      {systemReduceMotion && !settings.reduceMotion ? (
        <AppCard tone="alt">
          <AppText variant="bodySmall">{t('settings.systemReduceMotion')}</AppText>
          <AppButton label={t('settings.enableReduceMotion')} variant="secondary" size="sm" style={{ marginTop: 8 }} onPress={() => update({ reduceMotion: true })} />
        </AppCard>
      ) : null}
      <Banner text={t('settings.accessibility.note')} icon="accessibility-outline" />
    </Screen>
  );
}
