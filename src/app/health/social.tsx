import React from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, AppCard, AppText, Screen, ScreenHeader, SourceLinks, TipList } from '@/components/ui';
import { useSubstance } from '@/hooks/useSubstance';
import { SOCIAL_SOURCES } from '@/utils/constants';

/**
 * "When someone offers you one": ready-made phrases and plans for evenings and friends who
 * still use. Advice follows addiction services' guidance (sources listed on screen).
 */
export default function SocialScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const substance = useSubstance();
  const cannabis = substance !== 'tobacco';
  return (
    <Screen>
      <ScreenHeader title={t('social.title')} subtitle={cannabis ? t('social.subtitleCannabis') : t('social.subtitle')} />
      <AppCard title={t('social.phrasesTitle')} tone="primary">
        <TipList
          icon="chatbubble-ellipses-outline"
          items={
            cannabis
              ? [t('social.phrasesCannabis.p1'), t('social.phrasesCannabis.p2'), t('social.phrasesCannabis.p3'), t('social.phrasesCannabis.p4')]
              : [t('social.phrases.p1'), t('social.phrases.p2'), t('social.phrases.p3'), t('social.phrases.p4')]
          }
        />
        <AppText variant="caption" tone="secondary" style={{ marginTop: 8 }}>
          {t('social.phrasesHint')}
        </AppText>
      </AppCard>
      <AppCard title={t('social.beforeTitle')}>
        <TipList items={[t('social.before.tip1'), t('social.before.tip2'), t('social.before.tip3')]} />
      </AppCard>
      <AppCard title={t('social.duringTitle')}>
        <TipList items={[t('social.during.tip1'), t('social.during.tip2'), t('social.during.tip3')]} />
      </AppCard>
      <AppCard title={t('social.friendsTitle')} tone="alt">
        <AppText variant="bodySmall">{t('social.friends')}</AppText>
      </AppCard>
      <AppCard title={t('social.afterTitle')}>
        <AppText variant="bodySmall">{t('social.after')}</AppText>
      </AppCard>
      <AppButton label={t('social.sos')} icon="hand-left" variant="sos" onPress={() => router.push('/(tabs)/sos')} />
      <AppCard title={t('common.sources')}>
        <SourceLinks sources={SOCIAL_SOURCES} />
      </AppCard>
    </Screen>
  );
}
