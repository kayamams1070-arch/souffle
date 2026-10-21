import React from 'react';
import { View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppText } from './AppText';

export interface ProgressBarProps {
  /** 0 to 1 */
  value: number;
  label?: string;
  /** Text alternative for screen readers, e.g. "3 sur 5". */
  accessibilityValueText?: string;
  tone?: 'primary' | 'accent' | 'warm';
  height?: number;
}

export function ProgressBar({ value, label, accessibilityValueText, tone = 'primary', height = 10 }: ProgressBarProps) {
  const theme = useAppTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const color = tone === 'accent' ? theme.colors.accent : tone === 'warm' ? theme.colors.warm : theme.colors.primary;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100), text: accessibilityValueText }}
      style={{ gap: 6 }}>
      {label ? (
        <AppText variant="bodySmall" tone="secondary">
          {label}
        </AppText>
      ) : null}
      <View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: theme.colors.surfaceAlt,
          overflow: 'hidden',
          borderWidth: theme.highContrast ? 1 : 0,
          borderColor: theme.colors.border,
        }}>
        <View style={{ width: `${clamped * 100}%`, height: '100%', backgroundColor: color, borderRadius: height / 2 }} />
      </View>
    </View>
  );
}
