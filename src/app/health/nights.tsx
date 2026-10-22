import React from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, AppCard, AppText, Banner, Screen, ScreenHeader, SourceLinks, TipList } from '@/components/ui';
import { useSubstance } from '@/hooks/useSubstance';
import { useSosSession } from '@/store/useSosSession';
import { NIGHTS_SOURCES } from '@/utils/constants';

/**
 * "Difficult nights" kit. Sleep problems and vivid dreams are among the most common and
 * longest-lasting cannabis withdrawal symptoms; the evening routine tips follow general
 * sleep-hygiene advice (NHS). Useful for everyone, with cannabis-specific explanations.
 */
export default function NightsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const substance = useSubstance();
  const sos = useSosSession();
  const cannabis = substance !== 'tobacco';
  const sources = NIGHTS_SOURCES.filter((s) => cannabis || s.substance !== 'cannabis');
  return (
    <Screen>
      <ScreenHeader title={t('nights.title')} subtitle={t('nights.subtitle')} />
      <AppCard title={t('nights.whyTitle')} tone="primary">
        <AppText variant="bodySmall">{cannabis ? t('nights.whyCannabis') : t('nights.whyGeneral')}</AppText>
      </AppCard>
      <AppCard title={t('nights.eveningTitle')}>
        <TipList items={[t('nights.evening.tip1'), t('nights.evening.tip2'), t('nights.evening.tip3'), t('nights.evening.tip4'), t('nights.evening.tip5')]} />
      </AppCard>
      <AppButton
        label={t('nights.breathe')}
        icon="leaf-outline"
        onPress={() => {
          sos.begin({ intervention: 'breathing' });
          router.push('/sos/breathing');
        }}
      />
      <AppCard title={t('nights.awakeTitle')}>
        <TipList items={[t('nights.awake.tip1'), t('nights.awake.tip2'), t('nights.awake.tip3')]} />
      </AppCard>
      {cannabis ? (
        <AppCard title={t('nights.dreamsTitle')} tone="alt">
          <AppText variant="bodySmall">{t('nights.dreams')}</AppText>
        </AppCard>
      ) : null}
      <AppButton label={t('nights.logSleep')} icon="moon-outline" variant="secondary" onPress={() => router.push('/health/sleep')} />
      <Banner text={t('nights.doctor')} tone="warm" icon="medkit-outline" />
      <AppCard title={t('common.sources')}>
        <SourceLinks sources={sources} />
      </AppCard>
    </Screen>
  );
}
