import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppText } from './AppText';
import { AppButton } from './AppButton';

interface StateProps {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
}

/** Friendly empty state: explains what the screen will show once there is data. */
export function EmptyState({ title, description, icon = 'leaf-outline', actionLabel, onAction }: StateProps) {
  const theme = useAppTheme();
  return (
    <View style={{ alignItems: 'center', gap: 10, padding: theme.spacing.xl }} accessible accessibilityLabel={`${title}. ${description ?? ''}`}>
      <Ionicons name={icon} size={40} color={theme.colors.accent} />
      <AppText variant="h3" align="center">
        {title}
      </AppText>
      {description ? (
        <AppText tone="secondary" align="center">
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <AppButton label={actionLabel} onPress={onAction} variant="secondary" fullWidth={false} style={{ marginTop: 8 }} />
      ) : null}
    </View>
  );
}

/** Error state for non-technical users: what happened and what to do next. */
export function ErrorState({ title, description, actionLabel, onAction }: StateProps) {
  const theme = useAppTheme();
  return (
    <View
      accessibilityRole="alert"
      style={{
        alignItems: 'center',
        gap: 10,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.dangerSoft,
        borderRadius: theme.radius.lg,
      }}>
      <Ionicons name="alert-circle-outline" size={36} color={theme.colors.dangerText} />
      <AppText variant="h3" tone="danger" align="center">
        {title}
      </AppText>
      {description ? (
        <AppText tone="danger" align="center">
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} variant="danger" fullWidth={false} /> : null}
    </View>
  );
}
