import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';
import {
  darkColors,
  highContrastDark,
  highContrastLight,
  lightColors,
  radius,
  spacing,
  typeScale,
  type ThemeColors,
} from './tokens';

export interface AppTheme {
  colors: ThemeColors;
  isDark: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  /** Multiplier applied to every font size. */
  fontScale: number;
  spacing: typeof spacing;
  radius: typeof radius;
  /** Font size helper that applies the user's scale. */
  fs: (size: keyof typeof typeScale | number) => number;
}

const FONT_SCALE_VALUES = { normal: 1, large: 1.15, xlarge: 1.3 } as const;

const ThemeContext = createContext<AppTheme | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const settings = useSettingsStore((s) => s.settings);
  const value = useMemo<AppTheme>(() => {
    const isDark = settings.theme === 'system' ? systemScheme === 'dark' : settings.theme === 'dark';
    const colors = settings.highContrast
      ? isDark
        ? highContrastDark
        : highContrastLight
      : isDark
        ? darkColors
        : lightColors;
    const fontScale = FONT_SCALE_VALUES[settings.fontScale];
    return {
      colors,
      isDark,
      highContrast: settings.highContrast,
      reduceMotion: settings.reduceMotion,
      fontScale,
      spacing,
      radius,
      fs: (size) => Math.round((typeof size === 'number' ? size : typeScale[size]) * fontScale),
    };
  }, [settings.theme, settings.highContrast, settings.fontScale, settings.reduceMotion, systemScheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }
  return ctx;
}
