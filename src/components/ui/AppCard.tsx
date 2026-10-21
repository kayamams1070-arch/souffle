import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/theme/ThemeContext';
import { elevation } from '@/theme/tokens';
import { AppText } from './AppText';

export interface AppCardProps {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  tone?: 'default' | 'primary' | 'accent' | 'warm' | 'danger' | 'alt';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  padded?: boolean;
  testID?: string;
}

export function AppCard({
  children,
  title,
  subtitle,
  onPress,
  tone = 'default',
  style,
  accessibilityLabel,
  padded = true,
  testID,
}: AppCardProps) {
  const theme = useAppTheme();
  const { colors } = theme;
  const bg =
    tone === 'primary'
      ? colors.primarySoft
      : tone === 'accent'
        ? colors.accentSoft
        : tone === 'warm'
          ? colors.warmSoft
          : tone === 'danger'
            ? colors.dangerSoft
            : tone === 'alt'
              ? colors.surfaceAlt
              : colors.surface;
  const content = (
    <>
      {title ? (
        <View style={styles.header}>
          <AppText variant="h3">{title}</AppText>
          {subtitle ? (
            <AppText variant="bodySmall" tone="secondary">
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {children}
    </>
  );
  const baseStyle = [
    styles.card,
    {
      backgroundColor: bg,
      borderRadius: theme.radius.lg,
      padding: padded ? theme.spacing.lg : 0,
      borderWidth: theme.highContrast ? 1 : 0,
      borderColor: colors.border,
    },
    tone === 'default' && !theme.isDark ? elevation.card : null,
    style,
  ];
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [baseStyle, { opacity: pressed ? 0.85 : 1 }]}>
        {content}
      </Pressable>
    );
  }
  return (
    <View style={baseStyle} testID={testID} accessible={Boolean(accessibilityLabel)} accessibilityLabel={accessibilityLabel}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  header: { marginBottom: 12, gap: 2 },
});
