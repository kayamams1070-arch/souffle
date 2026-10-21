import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppCard, AppText, Banner, ListRow, Screen, ScreenHeader } from '@/components/ui';
import { useSettingsStore } from '@/store';
import { detectDeviceLanguage, SUPPORTED_LANGUAGES } from '@/i18n';
import type { Language } from '@/types';

export default function LanguageScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const update = useSettingsStore((s) => s.update);
  const device = detectDeviceLanguage();

  return (
    <Screen>
      <ScreenHeader title={t('settings.language.title')} subtitle={t('settings.language.subtitle')} />
      <AppCard>
        {SUPPORTED_LANGUAGES.map((lang: Language) => {
          const selected = settings.language === lang;
          return (
            <ListRow
              key={lang}
              icon="language-outline"
              title={t(`settings.language.${lang}`)}
              subtitle={t(`settings.language.native.${lang}`)}
              chevron={false}
              onPress={() => setLanguage(lang)}
              right={selected ? <Ionicons name="checkmark-circle" size={24} color={theme.colors.accent} accessibilityLabel={t('common.selected')} /> : undefined}
            />
          );
        })}
        <ListRow
          icon="phone-portrait-outline"
          title={t('settings.language.device')}
          subtitle={t('settings.language.deviceHint', { language: t(`settings.language.${device}`) })}
          chevron={false}
          onPress={() => update({ languageChosen: false, language: device })}
          right={!settings.languageChosen ? <Ionicons name="checkmark-circle" size={24} color={theme.colors.accent} accessibilityLabel={t('common.selected')} /> : undefined}
        />
      </AppCard>
      <View>
        <Banner text={t('settings.language.formats')} icon="calendar-outline" />
      </View>
      <AppText variant="caption" tone="secondary">
        {t('settings.language.supported')}
      </AppText>
    </Screen>
  );
}
