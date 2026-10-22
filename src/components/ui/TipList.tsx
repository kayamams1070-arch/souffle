import React from 'react';
import { Linking, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppButton } from './AppButton';
import { AppText } from './AppText';

/** Bulleted list of short, already translated tips. */
export function TipList({ items, icon = 'checkmark-circle-outline' }: { items: string[]; icon?: string }) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: 8 }}>
      {items.map((item) => (
        <View key={item} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Ionicons name={icon as never} size={18} color={theme.colors.success} style={{ marginTop: 1 }} />
          <AppText variant="bodySmall" style={{ flex: 1 }}>
            {item}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** Links to the public sources a screen relies on. */
export function SourceLinks({ sources }: { sources: { label: string; url: string }[] }) {
  return (
    <View style={{ gap: 2, alignItems: 'flex-start' }}>
      {sources.map((s) => (
        <AppButton key={s.url} label={s.label} variant="ghost" size="sm" fullWidth={false} icon="link-outline" onPress={() => void Linking.openURL(s.url).catch(() => undefined)} />
      ))}
    </View>
  );
}
