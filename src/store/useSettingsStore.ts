import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Language, NotificationCategory, NotificationPreferences, Settings } from '@/types';
import { STORAGE_KEYS, zustandStorage } from '@/services/storageService';
import { migrateSettingsState } from '@/services/migrationService';
import { SCHEMA_VERSION } from '@/utils/constants';

export const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  enabled: false,
  categories: {
    workout_reminder: true,
    encouragement: true,
    trigger_preparation: true,
    weekly_summary: true,
    milestone: true,
    pact_reminder: false,
    journal_reminder: false,
  },
  quietStartHour: 22,
  quietEndHour: 8,
  workoutReminderHour: 18,
  workoutReminderDays: [1, 3, 5],
  journalReminderHour: 20,
};

export const DEFAULT_SETTINGS: Settings = {
  language: 'fr',
  languageChosen: false,
  theme: 'system',
  fontScale: 'normal',
  highContrast: false,
  reduceMotion: false,
  hapticsEnabled: true,
  soundEnabled: true,
  voiceGuidanceEnabled: true,
  cravingForecastEnabled: true,
  notifications: DEFAULT_NOTIFICATIONS,
  demoMode: false,
};

export interface SettingsState {
  settings: Settings;
  hydrated: boolean;
  update: (patch: Partial<Settings>) => void;
  setLanguage: (language: Language) => void;
  updateNotifications: (patch: Partial<NotificationPreferences>) => void;
  toggleNotificationCategory: (category: NotificationCategory, value: boolean) => void;
  setDemoMode: (value: boolean) => void;
  reset: () => void;
  _setHydrated: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      hydrated: false,
      update: (patch) => set({ settings: { ...get().settings, ...patch } }),
      setLanguage: (language) =>
        set({ settings: { ...get().settings, language, languageChosen: true } }),
      updateNotifications: (patch) =>
        set({
          settings: {
            ...get().settings,
            notifications: { ...get().settings.notifications, ...patch },
          },
        }),
      toggleNotificationCategory: (category, value) =>
        set({
          settings: {
            ...get().settings,
            notifications: {
              ...get().settings.notifications,
              categories: { ...get().settings.notifications.categories, [category]: value },
            },
          },
        }),
      setDemoMode: (value) => set({ settings: { ...get().settings, demoMode: value } }),
      reset: () => set({ settings: DEFAULT_SETTINGS }),
      _setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: STORAGE_KEYS.settings,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ settings: s.settings }),
      migrate: (persisted, version) => migrateSettingsState(persisted, version),
      merge: (persisted, current) => {
        const p = (persisted as Partial<SettingsState>) ?? {};
        return {
          ...current,
          settings: {
            ...DEFAULT_SETTINGS,
            ...(p.settings ?? {}),
            notifications: {
              ...DEFAULT_NOTIFICATIONS,
              ...(p.settings?.notifications ?? {}),
              categories: {
                ...DEFAULT_NOTIFICATIONS.categories,
                ...(p.settings?.notifications?.categories ?? {}),
              },
            },
          },
        };
      },
      // Even if a stored value is corrupt, never leave the app stuck on the splash screen.
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.warn('[storage] rehydration failed', error);
        useSettingsStore.setState({ hydrated: true });
      },
    }
  )
);
