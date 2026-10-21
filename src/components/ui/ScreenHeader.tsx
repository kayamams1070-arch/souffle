import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppText } from './AppText';

/** Header with a back button for stack screens outside the tabs. */
export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          hitSlop={12}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -8 }}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <AppText variant="h1" style={{ flex: 1 }}>
          {title}
        </AppText>
        {right}
      </View>
      {subtitle ? <AppText tone="secondary">{subtitle}</AppText> : null}
    </View>
  );
}
