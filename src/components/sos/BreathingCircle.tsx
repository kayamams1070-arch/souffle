import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, cancelAnimation } from 'react-native-reanimated';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppText } from '@/components/ui';

export type BreathPhase = 'inhale' | 'exhale' | 'idle';

interface Props {
  phase: BreathPhase;
  /** Duration of the current phase in ms (drives the scale animation). */
  phaseMs: number;
  /** Progress within the phase 0..1 (used when animations are reduced). */
  phaseProgress: number;
  label: string;
  size?: number;
  running: boolean;
}

/** Breathing guide: a circle that grows on inhale and shrinks on exhale. */
export function BreathingCircle({ phase, phaseMs, phaseProgress, label, size = 240, running }: Props) {
  const theme = useAppTheme();
  const scale = useSharedValue(0.6);

  useEffect(() => {
    if (theme.reduceMotion) {
      scale.value = phase === 'inhale' ? 0.6 + 0.4 * phaseProgress : phase === 'exhale' ? 1 - 0.4 * phaseProgress : 0.6;
      return;
    }
    if (!running) {
      cancelAnimation(scale);
      return;
    }
    const target = phase === 'inhale' ? 1 : phase === 'exhale' ? 0.6 : 0.6;
    const remaining = Math.max(50, phaseMs * (1 - phaseProgress));
    scale.value = withTiming(target, { duration: remaining, easing: Easing.inOut(Easing.sin) });
    // phaseProgress intentionally excluded: we only restart the tween on phase change / resume.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, running, theme.reduceMotion]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={label} accessibilityLiveRegion="polite">
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.primarySoft, opacity: 0.6 }} />
      <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.primary, opacity: 0.85, position: 'absolute' }, style]} />
      <AppText variant="h2" style={{ color: theme.colors.textOnPrimary }} align="center">
        {label}
      </AppText>
    </View>
  );
}
