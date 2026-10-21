/**
 * Thin wrapper around expo-haptics. Every call is guarded: haptics are optional and
 * must never crash the app (web, simulators and some devices have no vibration motor).
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export function isHapticsSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function selection(): Promise<void> {
  if (!isHapticsSupported()) return;
  try {
    await Haptics.selectionAsync();
  } catch {
    // ignore: haptics are best-effort
  }
}

export async function impact(style: 'light' | 'medium' | 'heavy' | 'soft' = 'light'): Promise<void> {
  if (!isHapticsSupported()) return;
  const map = {
    light: Haptics.ImpactFeedbackStyle.Light,
    medium: Haptics.ImpactFeedbackStyle.Medium,
    heavy: Haptics.ImpactFeedbackStyle.Heavy,
    soft: Haptics.ImpactFeedbackStyle.Soft,
  } as const;
  try {
    await Haptics.impactAsync(map[style]);
  } catch {
    // ignore
  }
}

export async function notify(type: 'success' | 'warning' | 'error' = 'success'): Promise<void> {
  if (!isHapticsSupported()) return;
  const map = {
    success: Haptics.NotificationFeedbackType.Success,
    warning: Haptics.NotificationFeedbackType.Warning,
    error: Haptics.NotificationFeedbackType.Error,
  } as const;
  try {
    await Haptics.notificationAsync(map[type]);
  } catch {
    // ignore
  }
}
