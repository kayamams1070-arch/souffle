import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppText } from '@/components/ui';
import { getBadge } from '@/data/badges';
import { useHaptics } from '@/hooks/useHaptics';

/** Small celebratory banner shown when new badges are unlocked. */
export function BadgeToast({ badgeIds, onDismiss }: { badgeIds: string[]; onDismiss: () => void }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const haptics = useHaptics();
  useEffect(() => {
    if (badgeIds.length > 0) haptics.success();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badgeIds.length]);
  if (badgeIds.length === 0) return null;
  return (
    <Pressable
      accessibilityRole="alert"
      accessibilityLabel={t('badges.unlockedToast', { count: badgeIds.length })}
      onPress={onDismiss}
      style={{
        backgroundColor: theme.colors.warmSoft,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        gap: 8,
        borderWidth: theme.highContrast ? 1 : 0,
        borderColor: theme.colors.border,
      }}>
      <AppText weight="bold" tone="warm">
        {t('badges.unlockedToast', { count: badgeIds.length })}
      </AppText>
      {badgeIds.map((id) => {
        const badge = getBadge(id);
        if (!badge) return null;
        return (
          <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name={badge.icon as never} size={22} color={theme.colors.warmText} />
            <View style={{ flex: 1 }}>
              <AppText weight="semibold" tone="warm">
                {t(`badges.${badge.key}.title`)}
              </AppText>
              <AppText variant="caption" tone="warm">
                {t(`badges.${badge.key}.description`)}
              </AppText>
            </View>
          </View>
        );
      })}
      <AppText variant="caption" tone="warm">
        {t('common.tapToDismiss')}
      </AppText>
    </Pressable>
  );
}
