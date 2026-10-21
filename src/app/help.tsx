import React from 'react';
import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppButton, AppCard, AppText, Banner, Screen, ScreenHeader } from '@/components/ui';
import { useSettingsStore, useUserStore } from '@/store';
import { HELP_RESOURCES, type HelpResource } from '@/utils/constants';
import type { Language } from '@/types';

/** Countries listed first for each app language (the person can still see all of them). */
const COUNTRY_ORDER: Record<Language, HelpResource['country'][]> = {
  fr: ['BE', 'FR', 'NL', 'UK'],
  nl: ['BE', 'NL', 'FR', 'UK'],
  en: ['UK', 'BE', 'FR', 'NL'],
};

function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export default function HelpScreen() {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.settings.language);
  const substance = useUserStore((s) => s.user?.smoking.substance ?? 'tobacco');
  const open = (url: string) => void Linking.openURL(url).catch(() => undefined);
  const topics: HelpResource['topic'][] = substance === 'both' ? ['tobacco', 'cannabis'] : [substance];
  const order = COUNTRY_ORDER[language];

  return (
    <Screen>
      <ScreenHeader title={t('help.title')} subtitle={t('help.subtitle')} />
      <AppCard title={t('about.emergencyTitle')} tone="danger">
        <AppText variant="bodySmall">{t('about.emergency')}</AppText>
      </AppCard>
      {topics.map((topic) => (
        <View key={topic} style={{ gap: 12 }}>
          <AppText variant="h3">{t(`help.topics.${topic}`)}</AppText>
          {HELP_RESOURCES.filter((r) => r.topic === topic)
            .sort((a, b) => order.indexOf(a.country) - order.indexOf(b.country))
            .map((r) => (
              <AppCard key={r.id} title={`${r.name} (${t(`help.countries.${r.country}`)})`}>
                <View style={{ gap: 10 }}>
                  <AppText variant="bodySmall">{t(`help.resources.${r.id}`)}</AppText>
                  <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    {r.phone ? (
                      <AppButton
                        label={r.phone}
                        icon="call-outline"
                        size="sm"
                        fullWidth={false}
                        onPress={() => open(telUrl(r.phone!))}
                        accessibilityHint={t('help.callHint')}
                      />
                    ) : null}
                    <AppButton label={t('help.website')} icon="open-outline" variant="secondary" size="sm" fullWidth={false} onPress={() => open(r.url)} />
                  </View>
                </View>
              </AppCard>
            ))}
        </View>
      ))}
      <Banner text={t('about.helpNote')} icon="medkit-outline" />
      <AppText variant="caption" tone="secondary">
        {t('help.checked')}
      </AppText>
    </Screen>
  );
}
