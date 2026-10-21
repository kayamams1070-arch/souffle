import { coach, detectIntent, type CoachContext } from '@/services/coachService';
import { getWorkout } from '@/data/workouts';
import { getExercise } from '@/data/exercises';
import { makeUser } from './helpers';

const ctx = (overrides: Partial<CoachContext> = {}): CoachContext => ({
  user: makeUser(),
  sessions: [],
  cravings: [],
  language: 'fr',
  ...overrides,
});

describe('detectIntent', () => {
  it.each([
    ['Je suis fatigué.', 'tired'],
    ["J'ai envie de fumer après le café.", 'craving_coffee'],
    ["Je n'ai pas fait de sport cette semaine.", 'no_sport'],
    ["J'ai raté deux séances.", 'missed_sessions'],
    ['Je viens de rechuter.', 'relapsed'],
    ['J’ai fumé une cigarette', 'relapsed'],
    ['Ik ben moe', 'tired'],
    ['Ik heb zin in een sigaret bij mijn koffie', 'craving_coffee'],
    ['I missed two workouts', 'missed_sessions'],
    ['I am so stressed', 'stress'],
    ["J'ai mal au genou", 'pain'],
    ['bonjour', 'unknown'],
  ])('%s -> %s', (message, intent) => {
    expect(detectIntent(message)).toBe(intent);
  });

  it('checks safety (pain, dizziness) before anything else', () => {
    expect(detectIntent("Je suis fatigué et j'ai des vertiges")).toBe('pain');
  });

  it('understands cannabis vocabulary in the three languages', () => {
    expect(detectIntent("J'ai trop envie d'un joint ce soir")).toBe('craving_general');
    expect(detectIntent('Ik heb zin om te blowen')).toBe('craving_general');
    expect(detectIntent('I really want some weed')).toBe('craving_general');
    expect(detectIntent("J'ai fumé un joint hier")).toBe('relapsed');
    expect(detectIntent('Ik heb gisteren geblowd')).toBe('relapsed');
    expect(detectIntent('Je fais des cauchemars depuis que j’ai arrêté')).toBe('sleep');
    expect(detectIntent('Je suis tellement irritable')).toBe('anger');
    // Whole-word: no match inside unrelated words.
    expect(detectIntent('La jointure de mon genou va bien')).toBe('unknown');
  });

  it('avoids false positives on word fragments', () => {
    expect(detectIntent('Het is moeilijk vandaag')).not.toBe('tired'); // "moe" inside "moeilijk"
    expect(detectIntent('I made a cake')).toBe('unknown'); // "mad" inside "made"
    expect(detectIntent('Je suis mécontent')).not.toBe('proud'); // "content" inside "mécontent"
  });
});

describe('LocalRuleCoach replies', () => {
  it('asks for clarification instead of pretending to understand', () => {
    const r = coach.reply('blabla', ctx()) as ReturnType<typeof coach.reply> & {
      needsClarification: boolean;
    };
    expect(r.needsClarification).toBe(true);
  });

  it('always offers a concrete action and a gentle alternative', () => {
    for (const msg of [
      'Je suis fatigué',
      'stress',
      'colère',
      'ennui',
      'café',
      'raté une séance',
      'rechute',
    ]) {
      const r = coach.reply(msg, ctx()) as {
        action: { type: string };
        alternative: { type: string };
        key: string;
      };
      expect(r.action.type).toBeTruthy();
      expect(r.alternative.type).toBeTruthy();
      expect(r.key).toBeTruthy();
    }
  });

  it('never proposes an intense workout to someone in pain', () => {
    const r = coach.reply("J'ai mal au dos", ctx()) as { action: { type: string } };
    expect(r.action.type).toBe('rest');
  });

  it('softens anger management for declared limitations', () => {
    const r = coach.reply(
      'Je suis en colère',
      ctx({ user: makeUser({ limitations: ['knees'] }) })
    ) as { key: string; action: { type: string } };
    expect(r.key).toBe('anger_gentle');
    expect(r.action.type).toBe('breathing');
  });

  it('points to an existing themed workout (adapted to limitations when displayed)', () => {
    const r = coach.reply(
      'Je suis en colère',
      ctx({
        user: makeUser({ limitations: ['wrists', 'shoulders'], intensityPreference: 'dynamic' }),
      })
    ) as {
      action: { workoutId?: string };
    };
    expect(r.action.workoutId).toBeDefined();
    const w = getWorkout(r.action.workoutId!);
    expect(w).toBeDefined();
  });

  it('exposes only exercises that exist', () => {
    const r = coach.reply('fatigué', ctx()) as { action: { workoutId?: string } };
    const w = getWorkout(r.action.workoutId!);
    for (const b of w!.blocks) expect(getExercise(b.exerciseId)).toBeDefined();
  });
});
