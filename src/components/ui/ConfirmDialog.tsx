import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppText } from './AppText';
import { AppButton } from './AppButton';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

/** Explicit confirmation dialog, used for every irreversible action (delete, shield, relapse...). */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const theme = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType={theme.reduceMotion ? 'none' : 'fade'} onRequestClose={onCancel}>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={onCancel} accessibilityLabel={cancelLabel}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
          style={[
            styles.box,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.xl,
              borderWidth: theme.highContrast ? 1 : 0,
              borderColor: theme.colors.border,
            },
          ]}>
          <AppText variant="h2" accessibilityRole="header">
            {title}
          </AppText>
          {message ? <AppText tone="secondary">{message}</AppText> : null}
          {children}
          <View style={{ gap: 10, marginTop: 8 }}>
            <AppButton label={confirmLabel} onPress={onConfirm} variant={destructive ? 'danger' : 'primary'} />
            <AppButton label={cancelLabel} onPress={onCancel} variant="ghost" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24 },
  box: { gap: 12 },
});
