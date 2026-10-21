import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useAppTheme } from '@/theme/ThemeContext';
import { fontFamily, typeScale } from '@/theme/tokens';

export type TextVariant = keyof typeof typeScale;
export type TextTone = 'default' | 'secondary' | 'onPrimary' | 'accent' | 'danger' | 'warm' | 'success';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: keyof typeof fontFamily;
  align?: TextStyle['textAlign'];
  children?: React.ReactNode;
}

/**
 * Accessible text component: applies the theme, the user's font scale and a
 * readable line-height. Headings get the proper accessibility role.
 */
export function AppText({
  variant = 'body',
  tone = 'default',
  weight,
  align,
  style,
  children,
  ...rest
}: AppTextProps) {
  const theme = useAppTheme();
  const size = theme.fs(variant);
  const defaultWeight: keyof typeof fontFamily =
    variant === 'display' || variant === 'h1' || variant === 'h2' ? 'bold' : variant === 'h3' ? 'semibold' : 'regular';
  const color =
    tone === 'secondary'
      ? theme.colors.textSecondary
      : tone === 'onPrimary'
        ? theme.colors.textOnPrimary
        : tone === 'accent'
          ? theme.colors.accentText
          : tone === 'danger'
            ? theme.colors.dangerText
            : tone === 'warm'
              ? theme.colors.warmText
              : tone === 'success'
                ? theme.colors.successText
                : theme.colors.text;
  const isHeading = variant === 'display' || variant === 'h1' || variant === 'h2' || variant === 'h3';
  return (
    <Text
      accessibilityRole={isHeading ? 'header' : undefined}
      {...rest}
      style={[
        {
          fontFamily: fontFamily[weight ?? defaultWeight],
          fontSize: size,
          lineHeight: Math.round(size * (isHeading ? 1.25 : 1.45)),
          color,
          textAlign: align,
        },
        style,
      ]}>
      {children}
    </Text>
  );
}
