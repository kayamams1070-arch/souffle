/**
 * Single access point to on-device storage. Components never call AsyncStorage directly:
 * Zustand stores persist through `zustandStorage`, and export / delete go through the
 * helpers below so every key is known and versioned in one place.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';
import { SCHEMA_VERSION, STORAGE_PREFIX } from '@/utils/constants';

export const STORAGE_KEYS = {
  user: `${STORAGE_PREFIX}.user`,
  cravings: `${STORAGE_PREFIX}.cravings`,
  workouts: `${STORAGE_PREFIX}.workouts`,
  rewards: `${STORAGE_PREFIX}.rewards`,
  journal: `${STORAGE_PREFIX}.journal`,
  settings: `${STORAGE_PREFIX}.settings`,
  schemaVersion: `${STORAGE_PREFIX}.schemaVersion`,
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export const ALL_STORAGE_KEYS: StorageKey[] = Object.values(STORAGE_KEYS);

export class StorageError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export const zustandStorage: StateStorage = {
  getItem: async (name) => {
    try {
      return (await AsyncStorage.getItem(name)) ?? null;
    } catch (error) {
      console.warn('[storage] read failed', name, error);
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch (error) {
      console.warn('[storage] write failed', name, error);
      throw new StorageError(`Cannot write ${name}`, error);
    }
  },
  removeItem: async (name) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (error) {
      console.warn('[storage] remove failed', name, error);
    }
  },
};

export async function readRaw(key: StorageKey): Promise<string | null> {
  return zustandStorage.getItem(key) as Promise<string | null>;
}

export async function writeRaw(key: StorageKey, value: string): Promise<void> {
  await zustandStorage.setItem(key, value);
}

/** Reads every persisted key. Returned values are the raw JSON strings written by the stores. */
export async function readAll(): Promise<Record<string, string | null>> {
  const pairs = await AsyncStorage.multiGet(ALL_STORAGE_KEYS);
  const out: Record<string, string | null> = {};
  for (const [k, v] of pairs) out[k] = v;
  return out;
}

/** Deletes every key managed by the application. Nothing else on the device is touched. */
export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(ALL_STORAGE_KEYS);
  } catch (error) {
    throw new StorageError('Cannot clear storage', error);
  }
}

export async function writeSchemaVersion(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.schemaVersion, String(SCHEMA_VERSION));
}

export async function readSchemaVersion(): Promise<number | null> {
  const v = await AsyncStorage.getItem(STORAGE_KEYS.schemaVersion);
  return v ? Number(v) : null;
}
