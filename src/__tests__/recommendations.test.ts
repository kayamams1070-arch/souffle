import {
  adaptWorkout,
  currentProgramWeek,
  effectiveLevel,
  isLevelAvailable,
  nextProgramWorkout,
  suggestionForTrigger,
  unlockedLevel,
  workoutDurationSeconds,
} from '@/services/recommendationService';
import {
  ALL_WORKOUTS,
  getWorkout,
  PROGRAM_WORKOUTS,
  SOS_WORKOUT,
  THEMATIC_WORKOUTS,
} from '@/data/workouts';
import { EXERCISES, getExercise } from '@/data/exercises';
import { PROGRAM, PROGRAM_PHASES, phaseForWeek } from '@/data/program';
import { TRIGGERS, type Limitation } from '@/types';
import { local, makeUser, ms, session } from './helpers';

describe('workout catalogue integrity', () => {
  it('every block references an existing exercise', () => {
    for (const w of ALL_WORKOUTS) {
      for (const b of w.blocks) expect(getExercise(b.exerciseId)).toBeDefined();
    }
  });

  it('every low-impact alternative exists and is gentler or equal', () => {
    for (const e of EXERCISES) {
      if (!e.lowImpactAlternative) continue;
      const alt = getExercise(e.lowImpactAlternative);
      expect(alt).toBeDefined();
      expect(alt!.difficulty).toBeLessThanOrEqual(e.difficulty);
      expect(alt!.involvesJumping).toBeFalsy();
    }
  });

  it('the SOS mini workout lasts exactly 5 minutes', () => {
    expect(workoutDurationSeconds(SOS_WORKOUT)).toBe(300);
  });

  it('program sessions follow the duration bands of each level (warm-up and cool-down included)', () => {
    for (const w of PROGRAM_WORKOUTS) {
      const minutes = workoutDurationSeconds(w) / 60;
      const main = !w.isRecoverySession;
      if (w.level === 'beginner') expect(minutes).toBeGreaterThanOrEqual(main ? 9.5 : 8);
      if (w.level === 'beginner') expect(minutes).toBeLessThanOrEqual(12);
      if (w.level === 'intermediate' && main) expect(minutes).toBeGreaterThanOrEqual(18);
      if (w.level === 'intermediate') expect(minutes).toBeLessThanOrEqual(22);
      if (w.level === 'advanced' && main) expect(minutes).toBeGreaterThanOrEqual(25);
      if (w.level === 'advanced') expect(minutes).toBeLessThanOrEqual(30);
    }
  });

  it('has a 12-week program with 6 phases and 3 sessions per week for each level', () => {
    expect(PROGRAM).toHaveLength(12);
    expect(PROGRAM_PHASES).toHaveLength(6);
    for (const week of PROGRAM) {
      expect(week.recommendedSessions).toBeGreaterThanOrEqual(3);
      for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
        expect(week.workoutIds[level]).toHaveLength(3);
        for (const id of week.workoutIds[level]) expect(getWorkout(id)).toBeDefined();
      }
    }
    expect(phaseForWeek(1).key).toBe('habit');
    expect(phaseForWeek(12).key).toBe('autonomy');
  });

  it('progresses: week 12 is longer or equal to week 1 for main sessions', () => {
    for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
      const w1 = getWorkout(`prog_${level}_w1_strength`)!;
      const w12 = getWorkout(`prog_${level}_w12_strength`)!;
      expect(workoutDurationSeconds(w12)).toBeGreaterThanOrEqual(workoutDurationSeconds(w1));
    }
  });

  it('provides the thematic sessions of the brief', () => {
    expect(THEMATIC_WORKOUTS.map((w) => w.theme).sort()).toEqual(
      ['anger', 'boredom', 'calm', 'coffee', 'fatigue', 'reset', 'stress'].sort()
    );
  });
});

describe('adaptWorkout (declared limitations)', () => {
  const ids = (
    limitations: Limitation[],
    intensity: 'gentle' | 'moderate' | 'dynamic' = 'moderate'
  ) =>
    adaptWorkout(getWorkout('prog_advanced_w5_cardio')!, limitations, intensity).blocks.map(
      (b) => b.exerciseId
    );

  it('removes jumps for "no jumping", knees, breathing, pregnancy and gentle intensity', () => {
    for (const lim of ['no_jumping', 'knees', 'breathing', 'pregnancy'] as Limitation[]) {
      for (const id of ids([lim])) expect(getExercise(id)!.involvesJumping).toBeFalsy();
    }
    for (const id of ids([], 'gentle')) expect(getExercise(id)!.involvesJumping).toBeFalsy();
  });

  it('never keeps an exercise contraindicated for a declared limitation', () => {
    for (const lim of ['knees', 'back', 'shoulders', 'wrists', 'balance'] as Limitation[]) {
      for (const w of [...PROGRAM_WORKOUTS.slice(0, 40), ...THEMATIC_WORKOUTS, SOS_WORKOUT]) {
        for (const b of adaptWorkout(w, [lim]).blocks) {
          expect(getExercise(b.exerciseId)!.contraindications).not.toContain(lim);
        }
      }
    }
  });

  it('keeps the workout unchanged without limitation', () => {
    const w = getWorkout('prog_beginner_w1_strength')!;
    expect(adaptWorkout(w, [], 'moderate')).toBe(w);
  });
});

describe('level unlocks', () => {
  const user = makeUser({ sportLevel: 'beginner' });

  it('starts at beginner and unlocks intermediate after 6 sessions over 2 distinct weeks', () => {
    expect(unlockedLevel([])).toBe('beginner');
    const sameWeek = Array.from({ length: 6 }, (_, i) => session(local(2026, 4, 6 + i, 9)));
    expect(unlockedLevel(sameWeek)).toBe('beginner');
    const twoWeeks = [
      ...sameWeek.slice(0, 3),
      ...Array.from({ length: 3 }, (_, i) => session(local(2026, 4, 13 + i, 9))),
    ];
    expect(unlockedLevel(twoWeeks)).toBe('intermediate');
  });

  it('never forces a higher level and allows going back down', () => {
    const sessions = Array.from({ length: 20 }, (_, i) => session(local(2026, 3, 1 + i * 3, 9)));
    expect(unlockedLevel(sessions)).toBe('advanced');
    expect(effectiveLevel(user, sessions, null)).toBe('beginner');
    expect(effectiveLevel(user, sessions, 'advanced')).toBe('advanced');
    expect(effectiveLevel(makeUser({ sportLevel: 'advanced' }), [], 'beginner')).toBe('beginner');
  });

  it('caps the chosen level to what is unlocked', () => {
    expect(isLevelAvailable('intermediate', user, [])).toBe(false);
    expect(effectiveLevel(user, [], 'advanced')).toBe('beginner');
  });
});

describe('program week and next workout', () => {
  it('counts weeks from the first completed program session', () => {
    const first = session(local(2026, 4, 1, 9));
    expect(currentProgramWeek([], ms(local(2026, 4, 20)))).toBe(1);
    expect(currentProgramWeek([first], ms(local(2026, 4, 7, 9)))).toBe(1);
    expect(currentProgramWeek([first], ms(local(2026, 4, 8, 9)))).toBe(2);
    expect(currentProgramWeek([first], ms(local(2026, 12, 1)))).toBe(12);
  });

  it('suggests the first session of the week not done yet', () => {
    const user = makeUser();
    const next = nextProgramWorkout(
      user,
      [session(local(2026, 4, 1, 9), { workoutId: 'prog_beginner_w1_strength' })],
      null,
      ms(local(2026, 4, 2, 9))
    );
    expect(next?.workout.id).toBe('prog_beginner_w1_cardio');
    expect(next?.doneThisWeek).toBe(1);
  });
});

describe('suggestionForTrigger', () => {
  it('has a suggestion for every trigger', () => {
    for (const trigger of TRIGGERS)
      expect(suggestionForTrigger(trigger, makeUser()).intervention).toBeTruthy();
  });

  it('suggests an active session for anger but softens it for relevant limitations', () => {
    expect(suggestionForTrigger('anger', makeUser()).intervention).toBe('workout');
    const softened = suggestionForTrigger('anger', makeUser({ limitations: ['breathing'] }));
    expect(softened.intervention).toBe('breathing');
    expect(softened.softened).toBe(true);
    expect(
      suggestionForTrigger('anger', makeUser({ intensityPreference: 'gentle' })).softened
    ).toBe(true);
  });

  it('proposes a short walk after a meal and breathing for stress', () => {
    expect(suggestionForTrigger('after_meal', makeUser()).intervention).toBe('workout');
    expect(suggestionForTrigger('stress', makeUser()).intervention).toBe('breathing');
  });
});
