import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppCard } from './AppCard';
import { AppText } from './AppText';

export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'primary' | 'accent' | 'warm';
  onPress?: () => void;
  style?: React.ComponentProps<typeof AppCard>['style'];
}

export function StatCard({ label, value, hint, icon, tone = 'default', onPress, style }: StatCardProps) {
  const theme = useAppTheme();
  return (
    <AppCard tone={tone} onPress={onPress} style={[{ flex: 1, minWidth: 140 }, style]} accessibilityLabel={`${label}: ${value}. ${hint ?? ''}`}>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {icon ? <Ionicons name={icon} size={theme.fs(16)} color={theme.colors.textSecondary} /> : null}
          <AppText variant="caption" tone="secondary" weight="medium" numberOfLines={2} style={{ flex: 1 }}>
            {label}
          </AppText>
        </View>
        <AppText variant="h2" weight="bold">
          {value}
        </AppText>
        {hint ? (
          <AppText variant="caption" tone="secondary" numberOfLines={2}>
            {hint}
          </AppText>
        ) : null}
      </View>
    </AppCard>
  );
}
