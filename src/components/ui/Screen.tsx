import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppText } from './AppText';

export interface ScreenProps {
  children: React.ReactNode;
  /** Scrollable by default; set false for screens that manage their own layout (timers, lists). */
  scroll?: boolean;
  title?: string;
  subtitle?: string;
  /** Extra bottom padding to clear a sticky footer. */
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** Whether the screen is inside the tab navigator (the tab bar handles the bottom inset). */
  insideTabs?: boolean;
  testID?: string;
}

export function Screen({
  children,
  scroll = true,
  title,
  subtitle,
  footer,
  contentStyle,
  insideTabs = false,
  testID,
}: ScreenProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const paddingBottom = insideTabs ? theme.spacing.xl : Math.max(insets.bottom, theme.spacing.lg);

  const header =
    title || subtitle ? (
      <View style={styles.header}>
        {title ? <AppText variant="h1">{title}</AppText> : null}
        {subtitle ? (
          <AppText variant="body" tone="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
    ) : null;

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        styles.content,
        { padding: theme.spacing.lg, paddingBottom: footer ? theme.spacing.lg : paddingBottom },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {header}
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, { flex: 1, padding: theme.spacing.lg, paddingBottom: footer ? 0 : paddingBottom }, contentStyle]}>
      {header}
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      testID={testID}
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              padding: theme.spacing.lg,
              paddingBottom,
              backgroundColor: theme.colors.background,
              borderTopColor: theme.colors.border,
            },
          ]}>
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: 16 },
  header: { gap: 6, marginBottom: 4 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
});
