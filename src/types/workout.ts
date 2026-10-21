import type { Limitation, SportLevel } from './user';

export type ExerciseCategory = 'strength' | 'cardio' | 'mobility' | 'breathing' | 'warmup' | 'cooldown';

export interface ExerciseDefinition {
  id: string;
  /** Translation key prefix: exercises.<id>.name / .instructions / .easier / .harder / .safety */
  key: string;
  category: ExerciseCategory;
  difficulty: 1 | 2 | 3;
  /** Exercise id proposed instead when a limitation makes this one unsuitable. */
  lowImpactAlternative?: string;
  /** Limitations for which this exercise should be replaced. */
  contraindications: Limitation[];
  /** Whether the exercise involves jumping. */
  involvesJumping?: boolean;
}

/** An exercise placed inside a workout with its timing. */
export interface WorkoutBlock {
  exerciseId: string;
  durationSeconds: number;
  restSeconds: number;
  repetitions?: number;
}

export type WorkoutTheme =
  | 'general'
  | 'stress'
  | 'anger'
  | 'boredom'
  | 'coffee'
  | 'fatigue'
  | 'recovery'
  | 'calm'
  | 'reset'
  | 'sos';

export interface Workout {
  id: string;
  /** Translation key prefix: workouts.<id>.title / .description */
  key: string;
  level: SportLevel;
  /** 0 for thematic / SOS sessions that are not tied to a program week. */
  weekNumber: number;
  theme: WorkoutTheme;
  blocks: WorkoutBlock[];
  isRecoverySession: boolean;
}

export interface WorkoutSession {
  id: string;
  workoutId: string;
  startedAt: string;
  completedAt?: string;
  durationSeconds: number;
  completed: boolean;
  /** 1 to 5 */
  perceivedEffort?: number;
  notes?: string;
  /** Snapshot of the level the user was on when they trained. */
  level: SportLevel;
  /** Number of blocks actually performed (user may stop early). */
  blocksCompleted: number;
  totalBlocks: number;
}

export interface ProgramPhase {
  key: string;
  weeks: [number, number];
}

export interface ProgramWeek {
  weekNumber: number;
  phaseKey: string;
  recommendedSessions: number;
  workoutIds: Record<SportLevel, string[]>;
}
