/**
 * Local behavioural coach. Explicit keyword rules in the three supported languages.
 * No remote model is involved; the `CoachProvider` interface lets a future version plug
 * a remote AI without touching the screens.
 */
import type { Craving, Language, Mood, User, WorkoutSession } from '@/types';
import { getThematicWorkout } from '@/data/workouts';
import { adaptWorkout } from './recommendationService';
import { computeWorkoutStats } from './analyticsService';

export type CoachIntent =
  | 'tired'
  | 'craving_coffee'
  | 'craving_general'
  | 'stress'
  | 'anger'
  | 'boredom'
  | 'no_sport'
  | 'missed_sessions'
  | 'relapsed'
  | 'proud'
  | 'pain'
  | 'sleep'
  | 'motivation'
  | 'unknown';

export type CoachActionType = 'breathing' | 'workout' | 'distraction' | 'surf' | 'pact' | 'relapse' | 'journal' | 'rest' | 'medical';

export interface CoachAction {
  type: CoachActionType;
  workoutId?: string;
}

export interface CoachReply {
  intent: CoachIntent;
  /** i18n key: coach.replies.<key> (object with message / why / alt). */
  key: string;
  action: CoachAction;
  alternative: CoachAction;
  /** When true the UI shows clarification chips instead of acting. */
  needsClarification: boolean;
  /** Extra variables for interpolation. */
  vars?: Record<string, string | number>;
}

export interface CoachContext {
  user: User;
  sessions: WorkoutSession[];
  cravings: Craving[];
  mood?: Mood;
  language: Language;
  now?: number;
}

export interface CoachProvider {
  reply(message: string, ctx: CoachContext): Promise<CoachReply> | CoachReply;
}

const KEYWORDS: Record<Exclude<CoachIntent, 'unknown'>, string[]> = {
  pain: ['douleur', 'mal au', 'mal aux', 'blessé', 'blessure', 'vertige', 'malaise', 'pijn', 'duizelig', 'blessure', 'geblesseerd', 'in pain', 'painful', 'hurt', 'injur', 'dizzy', 'faint', 'chest'],
  relapsed: ['rechut', 'j\'ai fumé', 'jai fumé', 'craqué', 'fumé une', 'teruggevallen', 'gerookt', 'relaps', 'smoked', 'slipped', 'gave in', 'fumé un joint', 'fumé un pétard', 'geblowd', 'jointje gerookt', 'got high'],
  craving_coffee: ['café', 'koffie', 'coffee'],
  tired: ['fatigu', 'épuis', 'crevé', 'moe', 'uitgeput', 'tired', 'exhausted', 'drained'],
  stress: ['stress', 'anxi', 'angoiss', 'nerveu', 'tendu', 'gestrest', 'nerveus', 'gespannen', 'anxious', 'nervous', 'tense', 'overwhelmed'],
  anger: ['colère', 'énervé', 'furieux', 'irrit', 'prikkelbaar', 'rage', 'boos', 'kwaad', 'woedend', 'angry', 'furious', 'mad'],
  boredom: ['ennui', 'm\'ennuie', 'rien à faire', 'verveel', 'bored', 'boring', 'nothing to do'],
  no_sport: ['pas fait de sport', 'pas de sport', 'pas entraîné', 'pas bougé', 'niet gesport', 'geen sport', 'no sport', 'no workout', 'haven\'t exercised', 'didn\'t train'],
  missed_sessions: ['raté', 'manqué', 'sauté', 'gemist', 'overgeslagen', 'missed', 'skipped'],
  sleep: ['dormi', 'sommeil', 'insomn', 'cauchemar', 'nachtmerrie', 'nightmare', 'slaap', 'geslapen', 'sleep', 'slept', 'insomnia'],
  proud: ['fier', 'réussi', 'content', 'victoire', 'trots', 'gelukt', 'blij', 'proud', 'managed', 'happy', 'victory'],
  motivation: ['motiv', 'envie d\'arrêter', 'abandonn', 'à quoi bon', 'opgeven', 'motivatie', 'give up', 'what\'s the point', 'motivation'],
  craving_general: ['envie', 'fumer', 'cigarette', 'clope', 'zin in', 'roken', 'sigaret', 'craving', 'smoke', 'smoking', 'urge', 'joint', 'pétard', 'beuh', 'bédo', 'cannabis', 'hasch', 'spliff', 'blowen', 'wiet', 'hasj', 'weed', 'stoned'],
};

/** Ordered detection: safety first, then specific intents, generic last. */
const DETECTION_ORDER: Exclude<CoachIntent, 'unknown'>[] = [
  'pain',
  'relapsed',
  'craving_coffee',
  'anger',
  'stress',
  'boredom',
  'tired',
  'missed_sessions',
  'no_sport',
  'sleep',
  'proud',
  'motivation',
  'craving_general',
];

/** Keywords that must match a whole word (they are prefixes of unrelated words otherwise). */
const WHOLE_WORD = new Set(['moe', 'mad', 'boos', 'fier', 'blij', 'content', 'rage', 'smoke', 'urge', 'joint', 'beuh', 'wiet', 'weed']);

const LETTER = '[a-z\\u00e0-\\u00ff\\u0153\\u00e6]';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Normalizes apostrophes so "j’ai" (typographic) matches "j'ai". */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[\u2019\u2018`´]/g, "'");
}

const PATTERNS: Record<Exclude<CoachIntent, 'unknown'>, RegExp[]> = Object.fromEntries(
  (Object.entries(KEYWORDS) as [Exclude<CoachIntent, 'unknown'>, string[]][]).map(([intent, words]) => [
    intent,
    words.map((w) => {
      // Keywords match at the start of a word; short ambiguous ones must match a whole word.
      // Explicit letter class (no lookbehind / \\p{L}) so the regex works on every JS engine.
      const end = WHOLE_WORD.has(w) ? `(?!${LETTER})` : '';
      return new RegExp(`(?:^|[^a-z\u00e0-\u00ff\u0153\u00e6])${escapeRegExp(normalize(w))}${end}`);
    }),
  ])
) as Record<Exclude<CoachIntent, 'unknown'>, RegExp[]>;

export function detectIntent(message: string): CoachIntent {
  const text = normalize(message);
  for (const intent of DETECTION_ORDER) {
    if (PATTERNS[intent].some((re) => re.test(text))) return intent;
  }
  return 'unknown';
}

function themed(theme: Parameters<typeof getThematicWorkout>[0], user: User): string | undefined {
  const w = getThematicWorkout(theme);
  return w ? adaptWorkout(w, user.limitations, user.intensityPreference).id : undefined;
}

export class LocalRuleCoach implements CoachProvider {
  reply(message: string, ctx: CoachContext): CoachReply {
    const intent = detectIntent(message);
    const { user } = ctx;
    const stats = computeWorkoutStats(ctx.sessions, ctx.now);
    const gentle = user.intensityPreference === 'gentle' || user.limitations.some((l) => ['breathing', 'knees', 'back', 'balance', 'pregnancy'].includes(l));
    const base = { needsClarification: false as const };
    switch (intent) {
      case 'pain':
        return { ...base, intent, key: 'pain', action: { type: 'rest' }, alternative: { type: 'medical' } };
      case 'relapsed':
        return { ...base, intent, key: 'relapsed', action: { type: 'relapse' }, alternative: { type: 'pact' } };
      case 'craving_coffee':
        return { ...base, intent, key: 'craving_coffee', action: { type: 'workout', workoutId: themed('coffee', user) }, alternative: { type: 'breathing' } };
      case 'anger':
        return gentle
          ? { ...base, intent, key: 'anger_gentle', action: { type: 'breathing' }, alternative: { type: 'workout', workoutId: themed('calm', user) } }
          : { ...base, intent, key: 'anger', action: { type: 'workout', workoutId: themed('anger', user) }, alternative: { type: 'breathing' } };
      case 'stress':
        return { ...base, intent, key: 'stress', action: { type: 'breathing' }, alternative: { type: 'workout', workoutId: themed('stress', user) } };
      case 'boredom':
        return { ...base, intent, key: 'boredom', action: { type: 'distraction' }, alternative: { type: 'workout', workoutId: themed('boredom', user) } };
      case 'tired':
        return { ...base, intent, key: 'tired', action: { type: 'workout', workoutId: themed('fatigue', user) }, alternative: { type: 'rest' } };
      case 'missed_sessions':
      case 'no_sport':
        return {
          ...base,
          intent,
          key: stats.thisWeek === 0 ? 'no_sport' : 'missed_sessions',
          action: { type: 'workout', workoutId: themed(ctx.mood === 'tired' ? 'fatigue' : 'reset', user) },
          alternative: { type: 'breathing' },
          vars: { thisWeek: stats.thisWeek },
        };
      case 'sleep':
        return { ...base, intent, key: 'sleep', action: { type: 'journal' }, alternative: { type: 'workout', workoutId: themed('calm', user) } };
      case 'proud':
        return { ...base, intent, key: 'proud', action: { type: 'journal' }, alternative: { type: 'pact' } };
      case 'motivation':
        return { ...base, intent, key: 'motivation', action: { type: 'pact' }, alternative: { type: 'journal' } };
      case 'craving_general':
        return { ...base, intent, key: 'craving_general', action: { type: 'breathing' }, alternative: { type: 'surf' } };
      case 'unknown':
      default:
        return { intent: 'unknown', key: 'unknown', action: { type: 'breathing' }, alternative: { type: 'journal' }, needsClarification: true };
    }
  }
}

export const coach: CoachProvider = new LocalRuleCoach();

/** Quick prompts shown as chips (i18n: coach.prompts.<id>). Each maps to a canonical message. */
export const COACH_PROMPTS: { id: string; intent: CoachIntent }[] = [
  { id: 'tired', intent: 'tired' },
  { id: 'coffee', intent: 'craving_coffee' },
  { id: 'no_sport', intent: 'no_sport' },
  { id: 'missed', intent: 'missed_sessions' },
  { id: 'relapsed', intent: 'relapsed' },
  { id: 'stress', intent: 'stress' },
];
