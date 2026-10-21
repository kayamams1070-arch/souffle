import type { SportLevel, Workout, WorkoutBlock, WorkoutTheme } from '@/types';

/**
 * Workout catalogue.
 * - Program workouts are generated per level / week / session type so that the 12-week
 *   program is a real progression (durations and difficulty grow with the phase).
 * - Thematic and SOS workouts are hand written.
 * Titles / descriptions are translated under workouts.<key>.{title,description}.
 */

type SessionType = 'strength' | 'cardio' | 'mobility';

const PHASE_OF_WEEK = (week: number) => Math.min(6, Math.max(1, Math.ceil(week / 2)));

interface Template {
  warmup: string[];
  main: Record<SessionType, string[]>;
  cooldown: string[];
  /** Base work seconds per main block, per phase 1..6 */
  work: number[];
  rest: number[];
  warmupSeconds: number;
  cooldownSeconds: number;
  /** Number of rounds of the main circuit per phase */
  rounds: number[];
  /** Rounds for mobility / recovery sessions (gentler, fixed). */
  mobilityRounds: number;
}

const TEMPLATES: Record<SportLevel, Template> = {
  beginner: {
    warmup: ['march', 'arm_circles'],
    main: {
      strength: ['chair_squat', 'wall_pushup', 'glute_bridge', 'dead_bug'],
      cardio: ['march', 'step_jacks', 'calf_raise', 'standing_balance'],
      mobility: ['shoulder_mobility', 'cat_cow', 'hip_stretch', 'hamstring_stretch'],
    },
    cooldown: ['recovery_breathing'],
    // ~10 min per session (warm-up and cool-down included), progression through work time.
    work: [25, 30, 35, 40, 40, 45],
    rest: [30, 30, 25, 25, 20, 20],
    warmupSeconds: 45,
    cooldownSeconds: 60,
    rounds: [2, 2, 2, 2, 2, 2],
    mobilityRounds: 2,
  },
  intermediate: {
    warmup: ['march', 'arm_circles', 'step_jacks'],
    main: {
      strength: ['squat', 'incline_pushup', 'glute_bridge', 'plank_knees', 'lunge'],
      cardio: ['high_knees', 'step_jacks', 'shadow_boxing', 'calf_raise', 'march'],
      mobility: ['cat_cow', 'hip_stretch', 'shoulder_mobility', 'hamstring_stretch', 'child_pose'],
    },
    cooldown: ['hamstring_stretch', 'recovery_breathing'],
    // ~20 min per session.
    work: [35, 40, 40, 45, 45, 50],
    rest: [25, 20, 20, 15, 15, 15],
    warmupSeconds: 50,
    cooldownSeconds: 60,
    rounds: [3, 3, 3, 3, 3, 3],
    mobilityRounds: 2,
  },
  advanced: {
    warmup: ['march', 'arm_circles', 'step_jacks', 'high_knees'],
    main: {
      strength: ['squat', 'incline_pushup', 'lunge', 'plank_knees', 'side_plank_knees', 'glute_bridge'],
      cardio: ['jumping_jacks', 'high_knees', 'mountain_climber_slow', 'shadow_boxing', 'squat', 'calf_raise'],
      mobility: ['cat_cow', 'hip_stretch', 'shoulder_mobility', 'hamstring_stretch', 'child_pose', 'seated_twist'],
    },
    cooldown: ['hamstring_stretch', 'hip_stretch', 'recovery_breathing'],
    // ~25-30 min per session.
    work: [45, 45, 50, 50, 55, 55],
    rest: [20, 20, 15, 15, 15, 15],
    warmupSeconds: 45,
    cooldownSeconds: 60,
    rounds: [3, 3, 3, 3, 3, 3],
    mobilityRounds: 2,
  },
};

const THEME_FOR_TYPE: Record<SessionType, WorkoutTheme> = {
  strength: 'general',
  cardio: 'general',
  mobility: 'recovery',
};

export function programWorkoutId(level: SportLevel, week: number, type: SessionType): string {
  return `prog_${level}_w${week}_${type}`;
}

function buildProgramWorkout(level: SportLevel, week: number, type: SessionType): Workout {
  const tpl = TEMPLATES[level];
  const phase = PHASE_OF_WEEK(week);
  const idx = phase - 1;
  const work = tpl.work[idx] ?? 40;
  const rest = tpl.rest[idx] ?? 20;
  const rounds = tpl.rounds[idx] ?? 1;
  const blocks: WorkoutBlock[] = [];
  for (const id of tpl.warmup) blocks.push({ exerciseId: id, durationSeconds: tpl.warmupSeconds, restSeconds: 5 });
  const mainRest = type === 'mobility' ? 10 : rest;
  const mainRounds = type === 'mobility' ? tpl.mobilityRounds : rounds;
  for (let r = 0; r < mainRounds; r += 1) {
    for (const id of tpl.main[type]) {
      blocks.push({ exerciseId: id, durationSeconds: type === 'mobility' ? work + 10 : work, restSeconds: mainRest });
    }
  }
  for (const id of tpl.cooldown) blocks.push({ exerciseId: id, durationSeconds: tpl.cooldownSeconds, restSeconds: 0 });
  return {
    id: programWorkoutId(level, week, type),
    key: `${level}_${type}`,
    level,
    weekNumber: week,
    theme: THEME_FOR_TYPE[type],
    blocks,
    isRecoverySession: type === 'mobility',
  };
}

const LEVELS: SportLevel[] = ['beginner', 'intermediate', 'advanced'];
const TYPES: SessionType[] = ['strength', 'cardio', 'mobility'];

export const PROGRAM_WORKOUTS: Workout[] = LEVELS.flatMap((level) =>
  Array.from({ length: 12 }, (_, i) => i + 1).flatMap((week) => TYPES.map((type) => buildProgramWorkout(level, week, type)))
);

const b = (exerciseId: string, durationSeconds: number, restSeconds = 15): WorkoutBlock => ({ exerciseId, durationSeconds, restSeconds });

export const THEMATIC_WORKOUTS: Workout[] = [
  {
    id: 'theme_stress',
    key: 'theme_stress',
    level: 'beginner',
    weekNumber: 0,
    theme: 'stress',
    isRecoverySession: false,
    blocks: [b('march', 60, 10), b('shoulder_mobility', 45, 10), b('cat_cow', 45, 10), b('chair_squat', 40, 15), b('hip_stretch', 45, 10), b('box_breathing_soft', 90, 0)],
  },
  {
    id: 'theme_anger',
    key: 'theme_anger',
    level: 'beginner',
    weekNumber: 0,
    theme: 'anger',
    isRecoverySession: false,
    blocks: [b('march', 45, 10), b('shadow_boxing', 40, 15), b('step_jacks', 40, 15), b('shadow_boxing', 40, 15), b('chair_squat', 40, 15), b('recovery_breathing', 90, 0)],
  },
  {
    id: 'theme_boredom',
    key: 'theme_boredom',
    level: 'beginner',
    weekNumber: 0,
    theme: 'boredom',
    isRecoverySession: false,
    blocks: [b('step_jacks', 40, 10), b('standing_balance', 40, 10), b('calf_raise', 40, 10), b('wall_pushup', 40, 10), b('dead_bug', 40, 10), b('march', 60, 0)],
  },
  {
    id: 'theme_coffee',
    key: 'theme_coffee',
    level: 'beginner',
    weekNumber: 0,
    theme: 'coffee',
    isRecoverySession: false,
    blocks: [b('neck_rolls', 30, 5), b('shoulder_mobility', 45, 10), b('march', 60, 10), b('hamstring_stretch', 45, 10), b('recovery_breathing', 60, 0)],
  },
  {
    id: 'theme_fatigue',
    key: 'theme_fatigue',
    level: 'beginner',
    weekNumber: 0,
    theme: 'fatigue',
    isRecoverySession: true,
    blocks: [b('neck_rolls', 30, 5), b('cat_cow', 45, 10), b('seated_twist', 45, 10), b('hip_stretch', 45, 10), b('child_pose', 60, 10), b('recovery_breathing', 90, 0)],
  },
  {
    id: 'theme_calm',
    key: 'theme_calm',
    level: 'beginner',
    weekNumber: 0,
    theme: 'calm',
    isRecoverySession: true,
    blocks: [b('shoulder_mobility', 45, 10), b('hamstring_stretch', 45, 10), b('seated_forward_fold', 45, 10), b('box_breathing_soft', 120, 0)],
  },
  {
    id: 'theme_reset',
    key: 'theme_reset',
    level: 'beginner',
    weekNumber: 0,
    theme: 'reset',
    isRecoverySession: true,
    blocks: [b('recovery_breathing', 60, 5), b('march', 60, 10), b('shoulder_mobility', 45, 10), b('chair_squat', 40, 15), b('hip_stretch', 45, 10), b('box_breathing_soft', 60, 0)],
  },
];

/** The 5-minute SOS mini workout (gentle by design, adapted further by limitations). */
export const SOS_WORKOUT: Workout = {
  id: 'sos_5min',
  key: 'sos_5min',
  level: 'beginner',
  weekNumber: 0,
  theme: 'sos',
  isRecoverySession: false,
  blocks: [
    b('march', 45, 10),
    b('chair_squat', 35, 10),
    b('wall_pushup', 35, 10),
    b('high_knees', 35, 10),
    b('shoulder_mobility', 35, 10),
    b('recovery_breathing', 65, 0),
  ],
};

export const ALL_WORKOUTS: Workout[] = [...PROGRAM_WORKOUTS, ...THEMATIC_WORKOUTS, SOS_WORKOUT];

const BY_ID = new Map(ALL_WORKOUTS.map((w) => [w.id, w]));

export function getWorkout(id: string): Workout | undefined {
  return BY_ID.get(id);
}

export function getThematicWorkout(theme: WorkoutTheme): Workout | undefined {
  return THEMATIC_WORKOUTS.find((w) => w.theme === theme);
}
