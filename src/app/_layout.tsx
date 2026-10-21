import React, { useEffect, useMemo } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { AppThemeProvider, useAppTheme } from '@/theme/ThemeContext';
import { useStoresHydrated, useSettingsStore } from '@/store';
import { detectDeviceLanguage, initI18n, setLanguage } from '@/i18n';
import { useNotificationSync } from '@/hooks/useNotifications';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const theme = useAppTheme();
  useNotificationSync();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: theme.reduceMotion ? 'none' : 'default',
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sos/breathing" options={{ gestureEnabled: false }} />
        <Stack.Screen name="sos/workout" options={{ gestureEnabled: false }} />
        <Stack.Screen name="sos/distraction" />
        <Stack.Screen name="sos/feedback" options={{ gestureEnabled: false }} />
        <Stack.Screen name="craving/surf" options={{ gestureEnabled: false }} />
        <Stack.Screen name="workout/session" options={{ gestureEnabled: false }} />
        <Stack.Screen name="relapse/index" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const hydrated = useStoresHydrated();
  const settings = useSettingsStore((s) => s.settings);
  const language = useMemo(
    () => (settings.languageChosen ? settings.language : detectDeviceLanguage()),
    [settings.languageChosen, settings.language]
  );

  // i18n must be ready before the first screen renders text.
  initI18n(language);
  useEffect(() => {
    setLanguage(language);
  }, [language]);

  const ready = fontsLoaded && hydrated;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <RootNavigator />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
