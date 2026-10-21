import type { Craving, SmokingEvent, User, WorkoutSession } from '@/types';

/** Local date helper: new Date(y, m-1, d, h, min) as ISO. */
export function local(y: number, m: number, d: number, h = 12, min = 0): string {
  return new Date(y, m - 1, d, h, min, 0, 0).toISOString();
}

export function ms(iso: string): number {
  return new Date(iso).getTime();
}

export function makeUser(overrides: Partial<User> = {}): User {
  const createdAt = overrides.createdAt ?? local(2026, 3, 1, 8);
  return {
    id: 'usr_test',
    firstName: 'Alex',
    createdAt,
    updatedAt: createdAt,
    smoking: {
      cigarettesPerDay: 20,
      yearsSmoking: 10,
      cigarettesPerPack: 20,
      packPriceCents: 1000,
    },
    goal: 'quit',
    quitDate: createdAt,
    smokingBaselinePerDay: 20,
    sportLevel: 'beginner',
    intensityPreference: 'moderate',
    limitations: [],
    why: 'Pour mes enfants',
    reasons: ['family'],
    onboardingCompleted: true,
    ...overrides,
  };
}

export function smoke(
  occurredAt: string,
  cigarettes = 1,
  extra: Partial<SmokingEvent> = {}
): SmokingEvent {
  return { id: `smk_${occurredAt}_${cigarettes}`, occurredAt, cigarettes, ...extra };
}

let cravingSeq = 0;
export function craving(occurredAt: string, extra: Partial<Craving> = {}): Craving {
  cravingSeq += 1;
  return { id: `crv_${cravingSeq}`, occurredAt, intensity: 6, trigger: 'coffee', ...extra };
}

let sessionSeq = 0;
export function session(completedAt: string, extra: Partial<WorkoutSession> = {}): WorkoutSession {
  sessionSeq += 1;
  return {
    id: `ws_${sessionSeq}`,
    workoutId: 'prog_beginner_w1_strength',
    startedAt: completedAt,
    completedAt,
    durationSeconds: 600,
    completed: true,
    level: 'beginner',
    blocksCompleted: 10,
    totalBlocks: 10,
    ...extra,
  };
}
