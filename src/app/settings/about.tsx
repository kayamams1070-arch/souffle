import React from 'react';
import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppCard, AppText, Banner, ListRow, Screen, ScreenHeader } from '@/components/ui';
import { APP_VERSION, FAGERSTROM_SOURCE, HEALTH_SOURCES, HELP_RESOURCES, SCHEMA_VERSION } from '@/utils/constants';

export default function AboutScreen() {
  const { t } = useTranslation();
  const open = (url: string) => void Linking.openURL(url).catch(() => undefined);
  return (
    <Screen>
      <ScreenHeader title={t('about.title')} subtitle={`Souffle ${APP_VERSION} · ${t('about.schema', { version: SCHEMA_VERSION })}`} />
      <Banner text={t('about.notMedical')} tone="warm" icon="medkit-outline" />
      <AppCard title={t('about.whatTitle')}>
        <AppText variant="bodySmall">{t('about.what')}</AppText>
      </AppCard>
      <AppCard title={t('about.helpTitle')} subtitle={t('about.helpSubtitle')}>
        {HELP_RESOURCES.map((r) => (
          <ListRow key={r.id} icon="call-outline" title={`${r.name} (${r.country})`} subtitle={`${r.phone} · ${r.url.replace('https://', '')}`} onPress={() => open(r.url)} />
        ))}
        <AppText variant="caption" tone="secondary" style={{ marginTop: 8 }}>
          {t('about.helpNote')}
        </AppText>
      </AppCard>
      <AppCard title={t('about.emergencyTitle')} tone="danger">
        <AppText variant="bodySmall">{t('about.emergency')}</AppText>
      </AppCard>
      <AppCard title={t('about.sourcesTitle')}>
        {Object.entries(HEALTH_SOURCES).map(([id, s]) => (
          <ListRow key={id} icon="link-outline" title={s.label} subtitle={s.url.replace('https://', '')} onPress={() => open(s.url)} />
        ))}
        <ListRow icon="link-outline" title={FAGERSTROM_SOURCE.label} subtitle={FAGERSTROM_SOURCE.url.replace('https://', '')} onPress={() => open(FAGERSTROM_SOURCE.url)} />
      </AppCard>
      <AppCard title={t('about.limitsTitle')}>
        <View style={{ gap: 6 }}>
          {(['offline', 'coach', 'community', 'widget', 'notifications'] as const).map((k) => (
            <AppText key={k} variant="bodySmall">
              • {t(`about.limits.${k}`)}
            </AppText>
          ))}
        </View>
      </AppCard>
    </Screen>
  );
}
