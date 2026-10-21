import { Stack } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeContext';

export default function OnboardingLayout() {
  const theme = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: theme.reduceMotion ? 'none' : 'slide_from_right',
      }}
    />
  );
}
