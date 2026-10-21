import type { ProgramPhase, ProgramWeek, SportLevel } from '@/types';
import { programWorkoutId } from './workouts';
import { PROGRAM_WEEKS } from '@/utils/constants';

/** Texts under program.phases.<key>.{title,description} and program.weeks.w<n>.{goal,hardDay,review}. */
export const PROGRAM_PHASES: ProgramPhase[] = [
  { key: 'habit', weeks: [1, 2] },
  { key: 'basics', weeks: [3, 4] },
  { key: 'progress', weeks: [5, 6] },
  { key: 'endurance', weeks: [7, 8] },
  { key: 'consolidation', weeks: [9, 10] },
  { key: 'autonomy', weeks: [11, 12] },
];

export function phaseForWeek(week: number): ProgramPhase {
  return PROGRAM_PHASES.find((p) => week >= p.weeks[0] && week <= p.weeks[1]) ?? PROGRAM_PHASES[0]!;
}

const LEVELS: SportLevel[] = ['beginner', 'intermediate', 'advanced'];

export const PROGRAM: ProgramWeek[] = Array.from({ length: PROGRAM_WEEKS }, (_, i) => {
  const weekNumber = i + 1;
  const phase = phaseForWeek(weekNumber);
  const workoutIds = Object.fromEntries(
    LEVELS.map((level) => [
      level,
      [programWorkoutId(level, weekNumber, 'strength'), programWorkoutId(level, weekNumber, 'cardio'), programWorkoutId(level, weekNumber, 'mobility')],
    ])
  ) as Record<SportLevel, string[]>;
  return { weekNumber, phaseKey: phase.key, recommendedSessions: 3, workoutIds };
});

export function getProgramWeek(week: number): ProgramWeek | undefined {
  return PROGRAM[week - 1];
}
