import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppText, ProgressBar } from '@/components/ui';

export const ONBOARDING_STEPS = 5;

export function OnboardingHeader({ step, title, subtitle }: { step: number; title: string; subtitle?: string }) {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/onboarding'))}
          hitSlop={12}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar value={step / ONBOARDING_STEPS} accessibilityValueText={t('onboarding.stepOf', { step, total: ONBOARDING_STEPS })} height={6} />
        </View>
        <AppText variant="caption" tone="secondary">
          {step}/{ONBOARDING_STEPS}
        </AppText>
      </View>
      <AppText variant="h1">{title}</AppText>
      {subtitle ? <AppText tone="secondary">{subtitle}</AppText> : null}
    </View>
  );
}
