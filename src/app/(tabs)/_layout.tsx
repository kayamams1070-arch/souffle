import React from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { fontFamily } from '@/theme/tokens';
import { useHaptics } from '@/hooks/useHaptics';
import { AppText } from '@/components/ui';
import type { BottomTabBarButtonProps } from 'expo-router/js-tabs';

function SosTabButton(props: BottomTabBarButtonProps) {
  const theme = useAppTheme();
  const haptics = useHaptics();
  const { t } = useTranslation();
  const focused = props['aria-selected'] ?? false;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('tabs.sosA11y')}
      accessibilityState={{ selected: Boolean(focused) }}
      onPress={(e) => {
        haptics.medium();
        props.onPress?.(e);
      }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          marginTop: -28,
          backgroundColor: theme.colors.sos,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 4,
          borderColor: theme.colors.tabBar,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}>
        <Ionicons name="hand-left" size={26} color={theme.colors.sosText} />
      </View>
      <AppText variant="caption" weight="bold" style={{ color: focused ? theme.colors.sos : theme.colors.tabInactive, marginTop: 2 }}>
        {t('tabs.sos')}
      </AppText>
    </Pressable>
  );
}

export default function TabsLayout() {
  const theme = useAppTheme();
  // Keeps the tab bar above Android's navigation buttons and the iPhone home indicator.
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.border,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 11, marginBottom: 4 },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="sport"
        options={{
          title: t('tabs.sport'),
          tabBarIcon: ({ color, size }) => <Ionicons name="fitness-outline" size={size} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: t('tabs.sos'),
          tabBarButton: (props) => <SosTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('tabs.progress'),
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={String(color)} />,
        }}
      />
    </Tabs>
  );
}
