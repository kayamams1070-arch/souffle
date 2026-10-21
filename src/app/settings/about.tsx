import React from 'react';
import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppCard, AppText, Banner, ListRow, Screen, ScreenHeader } from '@/components/ui';
import { useRouter } from 'expo-router';
import { APP_NAME, APP_VERSION, CUDIT_SOURCE, FAGERSTROM_SOURCE, HEALTH_SOURCES, JOINT_WEIGHT_SOURCE, SCHEMA_VERSION } from '@/utils/constants';

export default function AboutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const open = (url: string) => void Linking.openURL(url).catch(() => undefined);
  return (
    <Screen>
      <ScreenHeader title={t('about.title')} subtitle={`${APP_NAME} ${APP_VERSION} · ${t('about.schema', { version: SCHEMA_VERSION })}`} />
      <Banner text={t('about.notMedical')} tone="warm" icon="medkit-outline" />
      <AppCard title={t('about.whatTitle')}>
        <AppText variant="bodySmall">{t('about.what')}</AppText>
      </AppCard>
      <AppCard title={t('about.helpTitle')} subtitle={t('about.helpSubtitle')}>
        <ListRow icon="call-outline" title={t('help.title')} subtitle={t('help.rowSubtitle')} onPress={() => router.push('/help')} />
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
        {[FAGERSTROM_SOURCE, CUDIT_SOURCE, JOINT_WEIGHT_SOURCE].map((s) => (
          <ListRow key={s.url} icon="link-outline" title={s.label} subtitle={s.url.replace('https://', '')} onPress={() => open(s.url)} />
        ))}
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
