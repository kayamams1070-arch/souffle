import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppText } from './AppText';
import { formatMinutesAsClock } from '@/utils/dates';

export interface CircularTimerProps {
  /** 0 to 1, portion elapsed. */
  progress: number;
  remainingSeconds: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  tone?: 'primary' | 'accent' | 'warm';
  children?: React.ReactNode;
}

/** Circular countdown driven by props: the caller owns the timing logic. */
export function CircularTimer({
  progress,
  remainingSeconds,
  size = 220,
  strokeWidth = 14,
  label,
  tone = 'primary',
  children,
}: CircularTimerProps) {
  const theme = useAppTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const dashOffset = circumference * (1 - clamped);
  const color = tone === 'accent' ? theme.colors.accent : tone === 'warm' ? theme.colors.warm : theme.colors.primary;
  const clock = formatMinutesAsClock(remainingSeconds);
  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={label ? `${label}, ${clock}` : clock}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.surfaceAlt}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children ?? (
        <View style={{ alignItems: 'center', gap: 4 }}>
          <AppText variant="display" weight="bold">
            {clock}
          </AppText>
          {label ? (
            <AppText variant="bodySmall" tone="secondary">
              {label}
            </AppText>
          ) : null}
        </View>
      )}
    </View>
  );
}
