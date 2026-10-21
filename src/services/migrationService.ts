/**
 * Versioned migrations for persisted store slices. Each store calls its migrate function
 * with the raw persisted object and the version it was written with. Version 1 is the
 * initial schema, so every migration below is currently a pass-through that also repairs
 * obviously missing fields (defensive for partial writes).
 *
 * To add a migration:
 *  1. bump SCHEMA_VERSION in utils/constants.ts
 *  2. add a `case <oldVersion>:` block that transforms the object to the next version
 */
import { SCHEMA_VERSION } from '@/utils/constants';
import { savingsStart } from '@/utils/calculations';
import type { User } from '@/types';

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
  return typeof value === 'object' && value !== null ? (value as AnyRecord) : {};
}

export function migrateUserState(persisted: unknown, version: number): AnyRecord {
  const state = asRecord(persisted);
  let v = version;
  while (v < SCHEMA_VERSION) {
    switch (v) {
      case 1: {
        // v1 -> v2: pin the savings start so that later quit-date changes keep the history.
        const user = state.user as User | null | undefined;
        if (user && typeof user === 'object' && !user.savingsStartDate && user.createdAt) {
          state.user = { ...user, savingsStartDate: savingsStart(user) };
        }
        break;
      }
      default:
        break;
    }
    v += 1;
  }
  if (!('draft' in state)) state.draft = {};
  if (!('user' in state)) state.user = null;
  return state;
}

export function migrateCravingState(persisted: unknown, version: number): AnyRecord {
  const state = asRecord(persisted);
  if (!Array.isArray(state.cravings)) state.cravings = [];
  if (!Array.isArray(state.smokingEvents)) state.smokingEvents = [];
  void version;
  return state;
}

export function migrateWorkoutState(persisted: unknown, version: number): AnyRecord {
  const state = asRecord(persisted);
  if (!Array.isArray(state.sessions)) state.sessions = [];
  if (!Array.isArray(state.breathingTests)) state.breathingTests = [];
  void version;
  return state;
}

export function migrateRewardState(persisted: unknown, version: number): AnyRecord {
  const state = asRecord(persisted);
  if (typeof state.xp !== 'number') state.xp = 0;
  if (!Array.isArray(state.events)) state.events = [];
  if (!Array.isArray(state.badges)) state.badges = [];
  if (!Array.isArray(state.shieldUses)) state.shieldUses = [];
  if (!Array.isArray(state.freezes)) state.freezes = [];
  if (typeof state.bestStreakDays !== 'number') state.bestStreakDays = 0;
  void version;
  return state;
}

export function migrateJournalState(persisted: unknown, version: number): AnyRecord {
  const state = asRecord(persisted);
  if (!Array.isArray(state.entries)) state.entries = [];
  if (!Array.isArray(state.sleep)) state.sleep = [];
  if (!Array.isArray(state.cough)) state.cough = [];
  if (!Array.isArray(state.challenges)) state.challenges = [];
  void version;
  return state;
}

export function migrateSettingsState(persisted: unknown, version: number): AnyRecord {
  const state = asRecord(persisted);
  void version;
  return state;
}
