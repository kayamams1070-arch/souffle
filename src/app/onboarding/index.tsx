import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dependenceTestRoute } from '@/utils/onboardingFlow';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppButton, AppCard, AppText, Screen } from '@/components/ui';
import { useUserStore, useSettingsStore } from '@/store';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { ChipGroup } from '@/components/ui/FormControls';
import { enterDemo } from '@/services/dataService';
import { APP_NAME } from '@/utils/constants';

export default function WelcomeScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const draft = useUserStore((s) => s.draft);
  const settings = useSettingsStore((s) => s.settings);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const [showHow, setShowHow] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  // Step 2 resumes at the first test not answered yet (Fagerström, then CUDIT-R).
  const dependenceResume =
    draft.smoking?.substance === 'both' && draft.smoking.dependenceScore !== undefined ? '/onboarding/cudit' : dependenceTestRoute(draft.smoking?.substance);
  const hasDraft = Boolean(draft.step && draft.step > 1);
  // Resume where the user stopped: draft.step is the next step to fill (2..5).
  const resumeRoute =
    draft.step === 5 ? '/onboarding/pact' : draft.step === 4 ? '/onboarding/goals' : draft.step === 3 ? '/onboarding/health' : draft.step === 2 ? dependenceResume : '/onboarding/profile';

  return (
    <Screen
      footer={
        <>
          <AppButton label={hasDraft ? t('onboarding.welcome.resume') : t('onboarding.welcome.start')} onPress={() => router.push(hasDraft ? resumeRoute : '/onboarding/profile')} size="lg" icon="arrow-forward" />
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
          {APP_NAME}
        </AppText>
        <AppText variant="h3" align="center" weight="medium" tone="secondary">
          {t('onboarding.welcome.tagline')}
        </AppText>
      </View>

      <ChipGroup
        label={t('settings.language.title')}
        options={SUPPORTED_LANGUAGES.map((l) => ({ value: l, label: t(`settings.language.native.${l}`) }))}
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
          onPress={async () => {
            setLoadingDemo(true);
            await enterDemo(settings.language);
            setLoadingDemo(false);
            router.replace('/(tabs)');
          }}
        />
      </AppCard>
    </Screen>
  );
}
