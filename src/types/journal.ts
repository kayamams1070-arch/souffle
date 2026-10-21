import type { Mood } from './craving';

export type JournalEntryType =
  | 'craving_overcome'
  | 'workout_done'
  | 'good_day'
  | 'decision'
  | 'gratitude'
  | 'free';

export interface JournalEntry {
  id: string;
  date: string;
  type: JournalEntryType;
  text: string;
  mood?: Mood;
}

export interface SleepEntry {
  id: string;
  /** Local day (YYYY-MM-DD) the night belongs to. */
  day: string;
  durationMinutes: number;
  /** 1 to 5 */
  quality: number;
  note?: string;
}

export interface CoughEntry {
  id: string;
  day: string;
  /** 0 to 10 */
  intensity: number;
  frequency: 'rare' | 'sometimes' | 'often' | 'constant';
  note?: string;
}

export interface Challenge {
  id: string;
  title: string;
  startDay: string;
  endDay: string;
  kind: 'smoke_free_days' | 'workouts' | 'cravings_overcome';
  target: number;
  createdAt: string;
  /** Demo challenges are local only; no remote participants exist. */
  isDemo: boolean;
}
