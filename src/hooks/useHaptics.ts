import { useMemo } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import * as hapticService from '@/services/hapticService';

/** Haptic helpers that respect the user's preference (silently no-op when disabled). */
export function useHaptics() {
  const enabled = useSettingsStore((s) => s.settings.hapticsEnabled);
  return useMemo(
    () => ({
      enabled,
      selection: () => {
        if (enabled) void hapticService.selection();
      },
      light: () => {
        if (enabled) void hapticService.impact('light');
      },
      medium: () => {
        if (enabled) void hapticService.impact('medium');
      },
      success: () => {
        if (enabled) void hapticService.notify('success');
      },
      warning: () => {
        if (enabled) void hapticService.notify('warning');
      },
    }),
    [enabled]
  );
}
