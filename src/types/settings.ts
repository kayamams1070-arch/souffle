export type Language = 'fr' | 'nl' | 'en';

export type ThemeMode = 'system' | 'light' | 'dark';

export type FontScale = 'normal' | 'large' | 'xlarge';

export type NotificationCategory =
  | 'workout_reminder'
  | 'encouragement'
  | 'trigger_preparation'
  | 'weekly_summary'
  | 'milestone'
  | 'pact_reminder'
  | 'journal_reminder';

export interface NotificationPreferences {
  enabled: boolean;
  categories: Record<NotificationCategory, boolean>;
  /** Allowed window, local hours (inclusive start, exclusive end). */
  quietStartHour: number;
  quietEndHour: number;
  workoutReminderHour: number;
  workoutReminderDays: number[]; // 0 = Sunday ... 6 = Saturday
  journalReminderHour: number;
}

export interface Settings {
  language: Language;
  /** True once the user explicitly chose a language (otherwise device language is used). */
  languageChosen: boolean;
  theme: ThemeMode;
  fontScale: FontScale;
  highContrast: boolean;
  reduceMotion: boolean;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  /** Voice guidance (text-to-speech) for Craving Surf and breathing. */
  voiceGuidanceEnabled: boolean;
  cravingForecastEnabled: boolean;
  notifications: NotificationPreferences;
  /** Explicit demo-mode flag: data was injected by the demo loader. */
  demoMode: boolean;
}

export interface AppDataExport {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  demoMode: boolean;
  data: Record<string, unknown>;
}
