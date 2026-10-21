import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppText } from './AppText';

export interface BannerProps {
  text: string;
  tone?: 'info' | 'warm' | 'danger' | 'success';
  icon?: keyof typeof Ionicons.glyphMap;
}

/** Inline information banner. Used for demo-mode notices, medical disclaimers and limits. */
export function Banner({ text, tone = 'info', icon }: BannerProps) {
  const theme = useAppTheme();
  const bg =
    tone === 'warm'
      ? theme.colors.warmSoft
      : tone === 'danger'
        ? theme.colors.dangerSoft
        : tone === 'success'
          ? theme.colors.successSoft
          : theme.colors.primarySoft;
  const fg =
    tone === 'warm'
      ? theme.colors.warmText
      : tone === 'danger'
        ? theme.colors.dangerText
        : tone === 'success'
          ? theme.colors.successText
          : theme.colors.text;
  const defaultIcon: keyof typeof Ionicons.glyphMap =
    tone === 'danger' ? 'alert-circle-outline' : tone === 'warm' ? 'flask-outline' : tone === 'success' ? 'checkmark-circle-outline' : 'information-circle-outline';
  return (
    <View
      accessibilityRole="text"
      style={{
        flexDirection: 'row',
        gap: 10,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        backgroundColor: bg,
        alignItems: 'flex-start',
        borderWidth: theme.highContrast ? 1 : 0,
        borderColor: theme.colors.border,
      }}>
      <Ionicons name={icon ?? defaultIcon} size={20} color={fg} style={{ marginTop: 2 }} />
      <AppText variant="bodySmall" style={{ color: fg, flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}
