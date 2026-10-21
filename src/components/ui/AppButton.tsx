import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { MIN_TOUCH } from '@/theme/tokens';
import { useHaptics } from '@/hooks/useHaptics';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'sos' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  icon,
  iconRight,
  fullWidth = true,
  style,
  accessibilityHint,
  testID,
}: AppButtonProps) {
  const theme = useAppTheme();
  const haptics = useHaptics();
  const { colors } = theme;

  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'secondary'
        ? colors.primarySoft
        : variant === 'danger'
          ? colors.dangerSoft
          : variant === 'sos'
            ? colors.sos
            : variant === 'accent'
              ? colors.accent
              : 'transparent';
  const fg =
    variant === 'primary' || variant === 'accent'
      ? colors.textOnPrimary
      : variant === 'danger'
        ? colors.dangerText
        : variant === 'sos'
          ? colors.sosText
          : variant === 'secondary'
            ? theme.isDark
              ? colors.text
              : colors.primary
            : colors.primary;
  const height = size === 'lg' ? 56 : size === 'sm' ? 40 : MIN_TOUCH;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      testID={testID}
      onPress={() => {
        haptics.selection();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          minHeight: height,
          borderRadius: theme.radius.md,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: colors.border,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: size === 'sm' ? 14 : 20,
          transform: [{ scale: pressed && !theme.reduceMotion ? 0.98 : 1 }],
        },
        style,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={theme.fs(size === 'lg' ? 22 : 18)} color={fg} /> : null}
            <AppText
              variant={size === 'lg' ? 'h3' : size === 'sm' ? 'bodySmall' : 'body'}
              weight="semibold"
              style={{ color: fg }}
              numberOfLines={2}>
              {label}
            </AppText>
            {iconRight ? <Ionicons name={iconRight} size={theme.fs(18)} color={fg} /> : null}
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
