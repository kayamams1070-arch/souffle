import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppButton, AppCard, AppText, Screen } from '@/components/ui';
import { useUserStore, useSettingsStore } from '@/store';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { ChipGroup } from '@/components/ui/FormControls';
import { loadDemoData } from '@/data/demoData';

export default function WelcomeScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const draft = useUserStore((s) => s.draft);
  const settings = useSettingsStore((s) => s.settings);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const [showHow, setShowHow] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const hasDraft = Boolean(draft.step && draft.step > 1);

  return (
    <Screen
      footer={
        <>
          <AppButton label={hasDraft ? t('onboarding.welcome.resume') : t('onboarding.welcome.start')} onPress={() => router.push('/onboarding/profile')} size="lg" icon="arrow-forward" />
          <AppButton label={t('onboarding.welcome.how')} variant="ghost" onPress={() => setShowHow((v) => !v)} />
        </>
      }>
      <View style={{ alignItems: 'center', gap: 16, paddingTop: 32 }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: theme.colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="leaf" size={48} color={theme.colors.accent} />
        </View>
        <AppText variant="display" align="center">
          Souffle
        </AppText>
        <AppText variant="h3" align="center" weight="medium" tone="secondary">
          {t('onboarding.welcome.tagline')}
        </AppText>
      </View>

      <ChipGroup
        label={t('settings.language.title')}
        options={SUPPORTED_LANGUAGES.map((l) => ({ value: l, label: t(`settings.language.${l}`) }))}
        value={settings.language}
        onChange={(l) => setLanguage(l)}
        compact
      />

      {showHow ? (
        <AppCard title={t('onboarding.welcome.howTitle')}>
          <View style={{ gap: 10 }}>
            {(['sos', 'sport', 'track', 'kind'] as const).map((k) => (
              <View key={k} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
                <AppText style={{ flex: 1 }}>{t(`onboarding.welcome.how_${k}`)}</AppText>
              </View>
            ))}
          </View>
        </AppCard>
      ) : null}

      <AppCard tone="alt">
        <AppText variant="bodySmall" tone="secondary">
          {t('onboarding.welcome.privacyNote')}
        </AppText>
        <AppButton label={t('onboarding.welcome.privacy')} variant="ghost" size="sm" fullWidth={false} onPress={() => router.push('/settings/privacy')} style={{ marginTop: 8 }} />
      </AppCard>

      <AppCard tone="warm">
        <AppText variant="bodySmall" tone="warm">
          {t('demo.welcomeHint')}
        </AppText>
        <AppButton
          label={t('demo.load')}
          variant="ghost"
          size="sm"
          fullWidth={false}
          loading={loadingDemo}
          style={{ marginTop: 8 }}
          onPress={() => {
            setLoadingDemo(true);
            loadDemoData();
            setLoadingDemo(false);
            router.replace('/(tabs)');
          }}
        />
      </AppCard>
    </Screen>
  );
}
