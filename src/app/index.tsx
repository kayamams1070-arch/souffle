import { Redirect } from 'expo-router';
import { useUserStore } from '@/store';

/** Entry: sends new users to the onboarding, others to the dashboard. */
export default function Index() {
  const user = useUserStore((s) => s.user);
  if (user?.onboardingCompleted) return <Redirect href="/(tabs)" />;
  return <Redirect href="/onboarding" />;
}
