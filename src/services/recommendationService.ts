/**
 * Local, rule-based recommendations: next workout, level unlocks, limitation-aware
 * adaptation, and the action suggested for a craving trigger. Pure functions, tested.
 */
import type {
  IntensityPreference,
  Limitation,
  SportLevel,
  Trigger,
  User,
  Workout,
  WorkoutBlock,
  WorkoutSession,
} from '@/types';
import { getExercise } from '@/data/exercises';
import { getThematicWorkout, getWorkout, SOS_WORKOUT } from '@/data/workouts';
import { getProgramWeek } from '@/data/program';
import { CRAVING_ALTERNATIVES } from '@/data/cravingAlternatives';
import { LEVEL_UNLOCK, PROGRAM_WEEKS } from '@/utils/constants';
import { dayKey, daysBetweenKeys } from '@/utils/dates';

const LEVEL_ORDER: SportLevel[] = ['beginner', 'intermediate', 'advanced'];

export function levelIndex(level: SportLevel): number {
  return LEVEL_ORDER.indexOf(level);
}

export function workoutDurationSeconds(workout: Workout): number {
  return workout.blocks.reduce((s, b) => s + b.durationSeconds + b.restSeconds, 0);
}

export function workoutDurationMinutes(workout: Workout): number {
  return Math.max(1, Math.round(workoutDurationSeconds(workout) / 60));
}

/**
 * Replaces exercises that conflict with the declared limitations by their low-impact
 * alternative (recursively, a few levels deep). Jumping is removed for 'no_jumping',
 * 'knees', 'breathing' and 'pregnancy'. A 'gentle' preference also removes jumps.
 */
export function adaptWorkout(workout: Workout, limitations: Limitation[], intensity: IntensityPreference = 'moderate'): Workout {
  if (limitations.length === 0 && intensity !== 'gentle') return workout;
  const avoidJumps = intensity === 'gentle' || limitations.some((l) => ['no_jumping', 'knees', 'breathing', 'pregnancy', 'balance'].includes(l));
  const resolve = (exerciseId: string, depth = 0): string => {
    const ex = getExercise(exerciseId);
    if (!ex || depth > 4) return exerciseId;
    const conflict = ex.contraindications.some((c) => limitations.includes(c)) || (avoidJumps && ex.involvesJumping);
    if (!conflict) return exerciseId;
    if (ex.lowImpactAlternative) return resolve(ex.lowImpactAlternative, depth + 1);
    return 'march';
  };
  const blocks: WorkoutBlock[] = workout.blocks.map((b) => ({ ...b, exerciseId: resolve(b.exerciseId) }));
  return { ...workout, blocks };
}

/** Program week index (1..12) based on the first completed program session. */
export function currentProgramWeek(sessions: WorkoutSession[], now = Date.now()): number {
  const first = sessions
    .filter((s) => s.completed && s.workoutId.startsWith('prog_'))
    .map((s) => s.completedAt ?? s.startedAt)
    .sort()[0];
  if (!first) return 1;
  const diffDays = daysBetweenKeys(dayKey(first), dayKey(now));
  return Math.min(PROGRAM_WEEKS, Math.max(1, Math.floor(diffDays / 7) + 1));
}

/** Distinct ISO weeks (Monday-based) in which at least one workout was completed. */
export function distinctActiveWeeks(sessions: WorkoutSession[]): number {
  const weeks = new Set<string>();
  for (const s of sessions) {
    if (!s.completed) continue;
    const d = new Date(s.completedAt ?? s.startedAt);
    const monday = new Date(d);
    const day = (d.getDay() + 6) % 7;
    monday.setDate(d.getDate() - day);
    weeks.add(dayKey(monday));
  }
  return weeks.size;
}

export function unlockedLevel(sessions: WorkoutSession[]): SportLevel {
  const completed = sessions.filter((s) => s.completed).length;
  const weeks = distinctActiveWeeks(sessions);
  if (completed >= LEVEL_UNLOCK.advanced.minWorkouts && weeks >= LEVEL_UNLOCK.advanced.minDistinctWeeks) return 'advanced';
  if (completed >= LEVEL_UNLOCK.intermediate.minWorkouts && weeks >= LEVEL_UNLOCK.intermediate.minDistinctWeeks) return 'intermediate';
  return 'beginner';
}

/** The level actually used for training: the user's declared level, capped by unlocks, overridable downward. */
export function effectiveLevel(user: Pick<User, 'sportLevel'>, sessions: WorkoutSession[], activeLevel: SportLevel | null): SportLevel {
  const maxAllowed = Math.max(levelIndex(user.sportLevel), levelIndex(unlockedLevel(sessions)));
  const wanted = activeLevel ?? user.sportLevel;
  const idx = Math.min(levelIndex(wanted), maxAllowed);
  return LEVEL_ORDER[Math.max(0, idx)] ?? 'beginner';
}

export function isLevelAvailable(level: SportLevel, user: Pick<User, 'sportLevel'>, sessions: WorkoutSession[]): boolean {
  const maxAllowed = Math.max(levelIndex(user.sportLevel), levelIndex(unlockedLevel(sessions)));
  return levelIndex(level) <= maxAllowed;
}

/** Workouts of the current week not yet completed this week, in order. */
export function nextProgramWorkout(user: User, sessions: WorkoutSession[], activeLevel: SportLevel | null, now = Date.now()): { workout: Workout; week: number; doneThisWeek: number } | null {
  const week = currentProgramWeek(sessions, now);
  const level = effectiveLevel(user, sessions, activeLevel);
  const program = getProgramWeek(week);
  if (!program) return null;
  const ids = program.workoutIds[level];
  const doneIds = new Set(
    sessions
      .filter((s) => s.completed && daysBetweenKeys(dayKey(s.completedAt ?? s.startedAt), dayKey(now)) < 7)
      .map((s) => s.workoutId)
  );
  const pendingId = ids.find((id) => !doneIds.has(id)) ?? ids[0];
  const workout = pendingId ? getWorkout(pendingId) : undefined;
  if (!workout) return null;
  return {
    workout: adaptWorkout(workout, user.limitations, user.intensityPreference),
    week,
    doneThisWeek: ids.filter((id) => doneIds.has(id)).length,
  };
}

export function sosWorkoutFor(user: Pick<User, 'limitations' | 'intensityPreference'>): Workout {
  return adaptWorkout(SOS_WORKOUT, user.limitations, user.intensityPreference);
}

export interface TriggerSuggestion {
  trigger: Trigger;
  intervention: 'breathing' | 'workout' | 'distraction' | 'craving_surf' | 'replacement_ritual';
  workout?: Workout;
  /** True when the intense default was softened because of declared limitations. */
  softened: boolean;
}

/** Action suggested right after the trigger is chosen. Intense defaults are softened for limitations. */
export function suggestionForTrigger(trigger: Trigger, user: Pick<User, 'limitations' | 'intensityPreference'>): TriggerSuggestion {
  const alt = CRAVING_ALTERNATIVES[trigger];
  const hasRelevantLimitation = user.limitations.some((l) => ['breathing', 'knees', 'back', 'balance', 'pregnancy'].includes(l));
  let intervention = alt.intervention;
  let softened = false;
  if (alt.intense && (hasRelevantLimitation || user.intensityPreference === 'gentle')) {
    intervention = 'breathing';
    softened = true;
  }
  const themed = alt.theme ? getThematicWorkout(alt.theme) : undefined;
  const workout = themed ? adaptWorkout(themed, user.limitations, user.intensityPreference) : undefined;
  return { trigger, intervention: intervention === 'none' ? 'breathing' : intervention, workout, softened };
}
