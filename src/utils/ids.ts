/**
 * Small local id generator. No external dependency needed: ids only have to be unique
 * on one device. Uses crypto.randomUUID when available (Hermes >= 0.12 exposes it),
 * otherwise falls back to a timestamp + random suffix.
 */
export function createId(prefix = 'id'): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) {
    return `${prefix}_${g.crypto.randomUUID()}`;
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}
