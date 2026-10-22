/**
 * DEMO DATA — entirely fictional. Loaded only on explicit request from the welcome screen
 * or the settings. Everything is generated relative to "now" so the dashboard looks alive.
 * Demo mode is flagged in settings.demoMode and can be reset safely from the settings.
 */
import type { Substance, Craving, CoughEntry, JournalEntry, Language, SleepEntry, SmokingEvent, User, WorkoutSession, XpEvent, BreathingTest, Challenge } from '@/types';
import { addDays, dayKey } from '@/utils/dates';
import { XP_RULES } from '@/utils/constants';
import { programWorkoutId } from './workouts';

export const DEMO_USER_ID = 'usr_demo';

/** Fictional texts of the demo profile, in the language chosen when the demo is loaded. */
const DEMO_TEXTS: Record<Language, { why: string; project: string; context: string; journal: string[]; challenge: string }> = {
  fr: {
    why: 'Pour retrouver mon souffle en jouant avec mes enfants, et pour le voyage en Italie.',
    project: 'Voyage en Italie',
    context: 'Soirée entre amis',
    journal: [
      'Café pris debout dans la cuisine au lieu du balcon. Ça a marché.',
      "Envie forte après le repas, 5 minutes de marche sur place et c'est passé.",
      'Une cigarette ce soir. Pas la fin du monde, je reprends demain.',
      'Journée complète sans envie difficile.',
      'Reconnaissant pour les encouragements de Léa.',
      'Séance mobilité terminée, les genoux vont mieux.',
    ],
    challenge: 'Défi perso : 7 jours de suite',
  },
  nl: {
    why: 'Om weer op adem te komen als ik met mijn kinderen speel, en voor de reis naar Italië.',
    project: 'Reis naar Italië',
    context: 'Avondje met vrienden',
    journal: [
      'Koffie rechtstaand in de keuken gedronken in plaats van op het balkon. Het werkte.',
      'Sterke zin na het eten, 5 minuten ter plaatse wandelen en het ging over.',
      'Eén sigaret vanavond. Geen ramp, morgen ga ik verder.',
      'Een hele dag zonder moeilijke zin.',
      'Dankbaar voor de aanmoediging van Lea.',
      'Mobiliteitssessie gedaan, mijn knieën voelen beter.',
    ],
    challenge: 'Eigen uitdaging: 7 dagen op rij',
  },
  en: {
    why: 'To get my breath back when I play with my kids, and for the trip to Italy.',
    project: 'Trip to Italy',
    context: 'Evening with friends',
    journal: [
      'Had my coffee standing in the kitchen instead of on the balcony. It worked.',
      'Strong craving after lunch, 5 minutes of marching on the spot and it passed.',
      'One cigarette tonight. Not the end of the world, I carry on tomorrow.',
      'A full day without a difficult craving.',
      "Grateful for Lea's encouragement.",
      'Mobility session done, my knees feel better.',
    ],
    challenge: 'Personal challenge: 7 days in a row',
  },
};

/** Fictional texts of the cannabis demo profile. */
const DEMO_TEXTS_CANNABIS: Record<Language, { why: string; project: string; context: string; journal: string[]; challenge: string }> = {
  fr: {
    why: 'Pour avoir les idées claires au travail, retrouver de vraies nuits et ne plus dépendre du joint du soir.',
    project: 'Nouveau vélo',
    context: 'Soirée chez un ami',
    journal: [
      "J'ai donné mon matériel à un ami. Plus rien à la maison.",
      "Envie forte en rentrant du travail. Douche, puis séance de 10 minutes : c'est passé.",
      "Un joint ce soir chez Malik. Pas grave, je reprends demain et je prépare ma phrase pour la prochaine fois.",
      'Rêves très intenses cette nuit. Je sais que ça fait partie du sevrage, ça va passer.',
      'Je me suis endormi sans rien pour la première fois depuis longtemps.',
      'Séance terminée, la tête plus claire.',
    ],
    challenge: 'Défi perso : 7 soirées sans',
  },
  nl: {
    why: 'Om helder te zijn op het werk, weer echt te slapen en niet meer afhankelijk te zijn van de joint van de avond.',
    project: 'Nieuwe fiets',
    context: 'Avond bij een vriend',
    journal: [
      'Ik heb mijn spullen aan een vriend gegeven. Niets meer in huis.',
      'Sterke zin bij thuiskomst van het werk. Douche en daarna een sessie van 10 minuten: het ging over.',
      'Eén joint vanavond bij Malik. Geen ramp, morgen ga ik verder en ik bereid mijn zin voor de volgende keer voor.',
      'Heel intense dromen vannacht. Ik weet dat het bij het afkicken hoort, het gaat voorbij.',
      'Voor het eerst sinds lang in slaap gevallen zonder iets.',
      'Sessie gedaan, mijn hoofd is helderder.',
    ],
    challenge: 'Eigen uitdaging: 7 avonden zonder',
  },
  en: {
    why: 'To think clearly at work, get real sleep again and stop depending on the evening joint.',
    project: 'New bike',
    context: "Evening at a friend's place",
    journal: [
      'Gave my gear to a friend. Nothing left at home.',
      'Strong craving coming home from work. Shower, then a 10-minute session: it passed.',
      "One joint tonight at Malik's. Not a big deal, I carry on tomorrow and I'm preparing what to say next time.",
      "Very vivid dreams last night. I know it's part of withdrawal, it will pass.",
      'Fell asleep without anything for the first time in a long while.',
      'Session done, clearer head.',
    ],
    challenge: 'Personal challenge: 7 evenings without',
  },
};

export function buildDemoData(now = new Date(), language: Language = 'fr', substance: Substance = 'tobacco') {
  const cannabis = substance === 'cannabis';
  const text = cannabis ? DEMO_TEXTS_CANNABIS[language] : DEMO_TEXTS[language];
  const at = (daysAgo: number, hour: number, minute = 0): Date => {
    const d = addDays(now, -daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d;
  };
  const quitDate = at(23, 7, 30);
  const user: User = {
    id: DEMO_USER_ID,
    firstName: cannabis ? 'Alex' : 'Sam',
    age: cannabis ? 29 : 38,
    createdAt: quitDate.toISOString(),
    updatedAt: now.toISOString(),
    smoking: cannabis
      ? {
          substance: 'cannabis',
          cigarettesPerDay: 0,
          yearsSmoking: 0,
          cigarettesPerPack: 20,
          packPriceCents: 0,
          // CUDIT-R answers (option indexes) giving 9 points: hazardous use band.
          cannabis: { jointsPerDay: 3, gramsPerJoint: 0.3, pricePerGramCents: 1000, yearsUsing: 7, mixedWithTobacco: false, cuditScore: 9, cuditLevel: 'hazardous', cuditAnswers: [4, 1, 1, 0, 1, 0, 0, 1] },
        }
      : {
          cigarettesPerDay: 15,
          yearsSmoking: 14,
          cigarettesPerPack: 20,
          packPriceCents: 950,
          dependenceScore: 5,
          dependenceLevel: 'medium',
          fagerstromAnswers: [2, 0, 0, 1, 1, 1],
        },
    goal: 'quit',
    quitDate: quitDate.toISOString(),
    smokingBaselinePerDay: cannabis ? 3 : 15,
    savingsStartDate: quitDate.toISOString(),
    sportLevel: 'beginner',
    intensityPreference: 'moderate',
    limitations: cannabis ? [] : ['knees'],
    why: text.why,
    reasons: cannabis ? ['health', 'freedom', 'money'] : ['family', 'breath', 'money'],
    personalPactSignedAt: quitDate.toISOString(),
    pactSignature: cannabis ? 'Alex' : 'Sam',
    savingsProject: { title: text.project, targetCents: cannabis ? 45000 : 60000 },
    onboardingCompleted: true,
  };

  // Craving pattern: morning coffee, after lunch, evening; decreasing over time.
  const cravings: Craving[] = [];
  const triggers = ['coffee', 'after_meal', 'stress', 'boredom', 'social', 'fatigue', 'night'] as const;
  const cannabisTriggers = ['screens', 'boredom', 'social', 'stress', 'night'] as const;
  const interventions = ['breathing', 'workout', 'distraction', 'craving_surf'] as const;
  let n = 0;
  for (let day = 22; day >= 0; day -= 1) {
    const count = day > 14 ? 3 : day > 7 ? 2 : 1;
    // Cannabis cravings cluster in the evening: coming home, screens, falling asleep.
    const slots = cannabis
      ? ([
          [18, 'after_work'],
          [23, 'to_sleep'],
          [21, cannabisTriggers[(day + 2) % cannabisTriggers.length]!],
        ] as const)
      : ([
          [8, 'coffee'],
          [13, 'after_meal'],
          [20, triggers[(day + 2) % triggers.length]!],
        ] as const);
    for (let i = 0; i < count; i += 1) {
      const slot = slots[i]!;
      const intensity = Math.max(2, Math.min(9, 8 - Math.floor((22 - day) / 5) + ((day + i) % 3) - 1));
      const intervention = interventions[(day + i) % interventions.length]!;
      const outcome = (day + i) % 5 === 0 ? 'persisted' : (day + i) % 3 === 0 ? 'partly_passed' : 'passed';
      cravings.push({
        id: `crv_demo_${n}`,
        occurredAt: at(day, slot[0], (i * 17) % 60).toISOString(),
        intensity,
        trigger: slot[1],
        interventionType: intervention,
        interventionCompleted: outcome !== 'persisted',
        outcome,
        durationSeconds: intervention === 'workout' ? 300 : intervention === 'craving_surf' ? 180 : 120,
        mood: i === 0 ? 'ok' : 'tense',
        locationType: i === 0 ? 'home' : 'work',
      });
      n += 1;
    }
  }

  // One isolated cigarette 10 days ago, handled kindly: streak reset, achievements kept.
  const smokingEvents: SmokingEvent[] = [
    {
      id: 'smk_demo_1',
      occurredAt: at(10, 21, 15).toISOString(),
      cigarettes: 1,
      ...(cannabis ? { kind: 'joint' as const } : {}),
      trigger: 'social',
      context: text.context,
      decision: 'continue_quit',
    },
  ];

  const sessions: WorkoutSession[] = [];
  const sessionDays = [21, 19, 17, 15, 12, 9, 7, 5, 3, 1];
  sessionDays.forEach((day, i) => {
    const week = Math.min(12, Math.floor((22 - day) / 7) + 1);
    const type = (['strength', 'cardio', 'mobility'] as const)[i % 3]!;
    const started = at(day, 18, 10);
    sessions.push({
      id: `ws_demo_${i}`,
      workoutId: programWorkoutId('beginner', week, type),
      startedAt: started.toISOString(),
      completedAt: new Date(started.getTime() + 11 * 60_000).toISOString(),
      durationSeconds: 11 * 60,
      completed: true,
      perceivedEffort: 2 + (i % 3),
      level: 'beginner',
      blocksCompleted: 9,
      totalBlocks: 9,
    });
  });

  // Cannabis demo: shorter, lighter nights during the first two weeks, then gradually better.
  const sleep: SleepEntry[] = cannabis
    ? Array.from({ length: 20 }, (_, i) => {
        const day = 20 - i;
        const early = day > 8;
        return {
          id: `slp_demo_${i}`,
          day: dayKey(at(day, 0)),
          durationMinutes: early ? 300 + ((i * 17) % 60) : 390 + ((i * 13) % 60),
          quality: early ? 1 + (i % 2) : 3 + (i % 2),
        };
      })
    : Array.from({ length: 12 }, (_, i) => {
        const day = 12 - i;
        return { id: `slp_demo_${i}`, day: dayKey(at(day, 0)), durationMinutes: 360 + ((i * 23) % 90), quality: 2 + ((i + day) % 3) };
      });
  const cough: CoughEntry[] = (cannabis ? [] : [21, 17, 13, 9, 5, 1]).map((day, i) => ({
    id: `cgh_demo_${i}`,
    day: dayKey(at(day, 0)),
    intensity: Math.max(0, 6 - i),
    frequency: i < 2 ? 'often' : i < 4 ? 'sometimes' : 'rare',
  }));

  const entries: JournalEntry[] = [
    { id: 'jr_demo_1', date: at(20, 21).toISOString(), type: 'decision', text: text.journal[0]!, mood: 'ok' },
    { id: 'jr_demo_2', date: at(15, 22).toISOString(), type: 'craving_overcome', text: text.journal[1]!, mood: 'calm' },
    { id: 'jr_demo_3', date: at(10, 22, 30).toISOString(), type: 'free', text: text.journal[2]!, mood: 'sad' },
    { id: 'jr_demo_4', date: at(7, 20).toISOString(), type: 'good_day', text: text.journal[3]!, mood: 'calm' },
    { id: 'jr_demo_5', date: at(3, 21).toISOString(), type: 'gratitude', text: text.journal[4]!, mood: 'ok' },
    { id: 'jr_demo_6', date: at(1, 19).toISOString(), type: 'workout_done', text: text.journal[5]!, mood: 'calm' },
  ];

  const breathingTests: BreathingTest[] = [
    { id: 'bt_demo_1', date: at(22, 9).toISOString(), protocol: 'souffle_v1', exhaleSeconds: 6, perceivedEffort: 4, breathlessness: 6 },
    { id: 'bt_demo_2', date: at(8, 9).toISOString(), protocol: 'souffle_v1', exhaleSeconds: 8, perceivedEffort: 3, breathlessness: 4 },
  ];

  const challenges: Challenge[] = [
    { id: 'chl_demo_1', title: text.challenge, startDay: dayKey(at(6, 0)), endDay: dayKey(at(-1, 0)), kind: 'smoke_free_days', target: 7, createdAt: at(6, 9).toISOString(), isDemo: true },
  ];

  // XP events mirror the facts above (idempotent ids).
  const xpEvents: XpEvent[] = [];
  for (const s of sessions) xpEvents.push({ id: `workout:${s.id}`, type: 'workout_completed', xp: XP_RULES.workout_completed, at: s.completedAt ?? s.startedAt });
  for (const c of cravings) {
    if (c.outcome === 'passed' || c.outcome === 'partly_passed') xpEvents.push({ id: `craving:${c.id}`, type: 'craving_overcome', xp: XP_RULES.craving_overcome, at: c.occurredAt });
    if (c.interventionCompleted) xpEvents.push({ id: `sos:${c.id}`, type: 'sos_completed', xp: XP_RULES.sos_completed, at: c.occurredAt });
  }
  for (const e of entries) {
    const isVictory = e.type !== 'free' && e.type !== 'gratitude';
    xpEvents.push(
      isVictory
        ? { id: `victory:${e.id}`, type: 'victory', xp: XP_RULES.victory, at: e.date }
        : { id: `journal:${e.id}`, type: 'journal_entry', xp: XP_RULES.journal_entry, at: e.date }
    );
  }
  for (const b of breathingTests) xpEvents.push({ id: `breathing_test:${b.id}`, type: 'breathing_test', xp: XP_RULES.breathing_test, at: b.date });
  xpEvents.push({ id: 'relapse_recovery:smk_demo_1', type: 'relapse_recovery', xp: XP_RULES.relapse_recovery, at: at(9, 18).toISOString() });
  const xp = xpEvents.reduce((s, e) => s + e.xp, 0);

  return { user, cravings, smokingEvents, sessions, sleep, cough, entries, breathingTests, challenges, xpEvents, xp };
}

export function isDemoUser(user: User | null): boolean {
  return user?.id === DEMO_USER_ID;
}
