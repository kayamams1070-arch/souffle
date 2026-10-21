import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { MIN_TOUCH } from '@/theme/tokens';
import { AppText } from './AppText';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  chevron?: boolean;
  tone?: 'default' | 'danger';
}

export function ListRow({ title, subtitle, icon, iconColor, onPress, right, chevron = true, tone = 'default' }: ListRowProps) {
  const theme = useAppTheme();
  const color = tone === 'danger' ? theme.colors.dangerText : theme.colors.text;
  const content = (
    <View style={[styles.row, { minHeight: MIN_TOUCH, borderBottomColor: theme.colors.border }]}>
      {icon ? (
        <View style={[styles.iconBox, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.sm }]}>
          <Ionicons name={icon} size={20} color={iconColor ?? (tone === 'danger' ? theme.colors.dangerText : theme.colors.primary)} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText weight="medium" style={{ color }}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="bodySmall" tone="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {onPress && chevron ? <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={subtitle} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBox: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
