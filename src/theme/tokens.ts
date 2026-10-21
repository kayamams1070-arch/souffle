/**
 * Design tokens. Palette from the product brief, with contrast-checked variants
 * (text on background >= 4.5:1, large text / icons >= 3:1).
 */
export const palette = {
  deepBlue: '#1E3A5F',
  deepBlueDark: '#15293F',
  deepBlueLight: '#2E5285',
  sage: '#7BA88F',
  sageDark: '#4E7B62',
  sageDeep: '#2F5A42',
  sageLight: '#D6E6DC',
  offWhite: '#F5F2EC',
  softOrange: '#E8A87C',
  /** Darkened soft orange: white text on it reaches 5.3:1 (WCAG AA). */
  softOrangeDark: '#9E5A2B',
  textPrimary: '#24313D',
  textSecondary: '#687582',
  /** Secondary text variant reaching >= 4.5:1 on every light surface (brief allows adjusting). */
  textSecondaryAA: '#5A6673',
  darkBackground: '#121A22',
  darkSurface: '#1C2833',
  darkSurfaceAlt: '#243444',
  error: '#C0392B',
  errorLight: '#F6D5D1',
  errorDark: '#FF8A7A',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  textOnPrimary: string;
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  warm: string;
  warmSoft: string;
  warmText: string;
  danger: string;
  dangerSoft: string;
  dangerText: string;
  success: string;
  successSoft: string;
  successText: string;
  sos: string;
  sosText: string;
  tabBar: string;
  tabInactive: string;
  overlay: string;
  chart: string[];
}

export const lightColors: ThemeColors = {
  background: palette.offWhite,
  surface: palette.white,
  surfaceAlt: '#ECEAE3',
  border: '#DAD6CC',
  text: palette.textPrimary,
  textSecondary: palette.textSecondaryAA,
  textOnPrimary: palette.white,
  primary: palette.deepBlue,
  primarySoft: '#DCE5F0',
  accent: palette.sageDark,
  accentSoft: palette.sageLight,
  accentText: palette.sageDeep,
  warm: palette.softOrangeDark,
  warmSoft: '#FBE4D3',
  warmText: '#8A4A1D',
  danger: palette.error,
  dangerSoft: palette.errorLight,
  dangerText: '#8E2418',
  success: palette.sageDark,
  successSoft: palette.sageLight,
  successText: palette.sageDeep,
  sos: palette.softOrangeDark,
  sosText: palette.white,
  tabBar: palette.white,
  tabInactive: palette.textSecondaryAA,
  overlay: 'rgba(18, 26, 34, 0.55)',
  chart: [palette.deepBlue, palette.sageDark, palette.softOrangeDark, '#6A5D8F', '#3C7A89'],
};

export const darkColors: ThemeColors = {
  background: palette.darkBackground,
  surface: palette.darkSurface,
  surfaceAlt: palette.darkSurfaceAlt,
  border: '#34475A',
  text: '#F2F4F6',
  textSecondary: '#AFBBC7',
  /** Light primary in dark mode: dark text keeps 8:1 contrast (white would be 2.2:1). */
  textOnPrimary: palette.darkBackground,
  primary: '#8FB3E2',
  primarySoft: '#263D5A',
  accent: palette.sage,
  accentSoft: '#27463A',
  accentText: '#BFE0CC',
  warm: palette.softOrange,
  warmSoft: '#4A3323',
  warmText: '#F6C9A6',
  danger: palette.errorDark,
  dangerSoft: '#4A2420',
  dangerText: '#FFB3A8',
  success: palette.sage,
  successSoft: '#27463A',
  successText: '#BFE0CC',
  sos: palette.softOrange,
  sosText: palette.darkBackground,
  tabBar: palette.darkSurface,
  tabInactive: '#8E9BA8',
  overlay: 'rgba(0, 0, 0, 0.6)',
  chart: ['#8FB3E2', palette.sage, palette.softOrange, '#B4A6DE', '#7FC4D3'],
};

export const highContrastLight: ThemeColors = {
  ...lightColors,
  background: palette.white,
  surface: palette.white,
  surfaceAlt: '#EEEEEE',
  border: '#555555',
  text: palette.black,
  textSecondary: '#2E2E2E',
  primary: '#0F2A4B',
  accent: '#1E5A36',
  accentText: '#0E3A20',
  warm: '#8F4A12',
  warmText: '#5E2E05',
  sos: '#8F4A12',
  tabInactive: '#333333',
};

export const highContrastDark: ThemeColors = {
  ...darkColors,
  background: palette.black,
  surface: '#0E0E0E',
  surfaceAlt: '#1C1C1C',
  border: '#9A9A9A',
  text: palette.white,
  textSecondary: '#E6E6E6',
  primary: '#B7D3F5',
  accent: '#A9D7BC',
  accentText: '#DDF3E6',
  warm: '#F5C29E',
  warmText: '#FFE1C9',
  sos: '#F5C29E',
  tabInactive: '#D0D0D0',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const elevation = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typeScale = {
  display: 44,
  h1: 28,
  h2: 22,
  h3: 18,
  body: 16,
  bodySmall: 14,
  caption: 12,
} as const;

/** Minimum touch target recommended by both platforms. */
export const MIN_TOUCH = 48;
