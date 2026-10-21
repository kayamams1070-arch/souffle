/**
 * DEMO DATA — entirely fictional. Loaded only on explicit request from the welcome screen
 * or the settings. Everything is generated relative to "now" so the dashboard looks alive.
 * Demo mode is flagged in settings.demoMode and can be reset safely from the settings.
 */
import type { Craving, CoughEntry, JournalEntry, SleepEntry, SmokingEvent, User, WorkoutSession, XpEvent, BreathingTest, Challenge } from '@/types';
import { useCravingStore, useJournalStore, useRewardStore, useSettingsStore, useUserStore, useWorkoutStore } from '@/store';
import { addDays, dayKey } from '@/utils/dates';
import { XP_RULES } from '@/utils/constants';
import { programWorkoutId } from './workouts';

export const DEMO_USER_ID = 'usr_demo';

function at(daysAgo: number, hour: number, minute = 0): Date {
  const d = addDays(new Date(), -daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function buildDemoData(now = new Date()) {
  const quitDate = at(23, 7, 30);
  const user: User = {
    id: DEMO_USER_ID,
    firstName: 'Sam',
    age: 38,
    createdAt: quitDate.toISOString(),
    updatedAt: now.toISOString(),
    smoking: {
      cigarettesPerDay: 15,
      yearsSmoking: 14,
      cigarettesPerPack: 20,
      packPriceCents: 950,
      dependenceScore: 5,
      dependenceLevel: 'moderate',
      fagerstromAnswers: [2, 0, 0, 1, 1, 1],
    },
    goal: 'quit',
    quitDate: quitDate.toISOString(),
    smokingBaselinePerDay: 15,
    sportLevel: 'beginner',
    intensityPreference: 'moderate',
    limitations: ['knees'],
    why: 'Pour retrouver mon souffle en jouant avec mes enfants, et pour le voyage en Italie.',
    reasons: ['family', 'breath', 'money'],
    personalPactSignedAt: quitDate.toISOString(),
    pactSignature: 'Sam',
    savingsProject: { title: 'Voyage en Italie', targetCents: 60000 },
    onboardingCompleted: true,
  };

  // Craving pattern: morning coffee, after lunch, evening; decreasing over time.
  const cravings: Craving[] = [];
  const triggers = ['coffee', 'after_meal', 'stress', 'boredom', 'social', 'fatigue', 'night'] as const;
  const interventions = ['breathing', 'workout', 'distraction', 'craving_surf'] as const;
  let n = 0;
  for (let day = 22; day >= 0; day -= 1) {
    const count = day > 14 ? 3 : day > 7 ? 2 : 1;
    const slots = [
      [8, 'coffee'],
      [13, 'after_meal'],
      [20, triggers[(day + 2) % triggers.length]!],
    ] as const;
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
      trigger: 'social',
      context: 'Soirée entre amis',
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

  const sleep: SleepEntry[] = Array.from({ length: 12 }, (_, i) => {
    const day = 12 - i;
    return { id: `slp_demo_${i}`, day: dayKey(at(day, 0)), durationMinutes: 360 + ((i * 23) % 90), quality: 2 + ((i + day) % 3) };
  });
  const cough: CoughEntry[] = [21, 17, 13, 9, 5, 1].map((day, i) => ({
    id: `cgh_demo_${i}`,
    day: dayKey(at(day, 0)),
    intensity: Math.max(0, 6 - i),
    frequency: i < 2 ? 'often' : i < 4 ? 'sometimes' : 'rare',
  }));

  const entries: JournalEntry[] = [
    { id: 'jr_demo_1', date: at(20, 21).toISOString(), type: 'decision', text: 'Café pris debout dans la cuisine au lieu du balcon. Ça a marché.', mood: 'ok' },
    { id: 'jr_demo_2', date: at(15, 22).toISOString(), type: 'craving_overcome', text: 'Envie forte après le repas, 5 minutes de marche sur place et c\'est passé.', mood: 'calm' },
    { id: 'jr_demo_3', date: at(10, 22, 30).toISOString(), type: 'free', text: 'Une cigarette ce soir. Pas la fin du monde, je reprends demain.', mood: 'sad' },
    { id: 'jr_demo_4', date: at(7, 20).toISOString(), type: 'good_day', text: 'Journée complète sans envie difficile.', mood: 'calm' },
    { id: 'jr_demo_5', date: at(3, 21).toISOString(), type: 'gratitude', text: 'Reconnaissant pour les encouragements de Léa.', mood: 'ok' },
    { id: 'jr_demo_6', date: at(1, 19).toISOString(), type: 'workout_done', text: 'Séance mobilité terminée, les genoux vont mieux.', mood: 'calm' },
  ];

  const breathingTests: BreathingTest[] = [
    { id: 'bt_demo_1', date: at(22, 9).toISOString(), protocol: 'souffle_v1', exhaleSeconds: 6, perceivedEffort: 4, breathlessness: 6 },
    { id: 'bt_demo_2', date: at(8, 9).toISOString(), protocol: 'souffle_v1', exhaleSeconds: 8, perceivedEffort: 3, breathlessness: 4 },
  ];

  const challenges: Challenge[] = [
    { id: 'chl_demo_1', title: 'Défi perso : 7 jours de suite', startDay: dayKey(at(6, 0)), endDay: dayKey(at(-1, 0)), kind: 'smoke_free_days', target: 7, createdAt: at(6, 9).toISOString(), isDemo: true },
  ];

  // XP events mirror the facts above (idempotent ids).
  const xpEvents: XpEvent[] = [];
  for (const s of sessions) xpEvents.push({ id: `workout:${s.id}`, type: 'workout_completed', xp: XP_RULES.workout_completed, at: s.completedAt ?? s.startedAt });
  for (const c of cravings) {
    if (c.outcome === 'passed' || c.outcome === 'partly_passed') xpEvents.push({ id: `craving:${c.id}`, type: 'craving_overcome', xp: XP_RULES.craving_overcome, at: c.occurredAt });
    if (c.interventionCompleted) xpEvents.push({ id: `sos:${c.id}`, type: 'sos_completed', xp: XP_RULES.sos_completed, at: c.occurredAt });
  }
  for (const e of entries) xpEvents.push({ id: `journal:${e.id}`, type: 'journal_entry', xp: XP_RULES.journal_entry, at: e.date });
  for (const b of breathingTests) xpEvents.push({ id: `breathing_test:${b.id}`, type: 'breathing_test', xp: XP_RULES.breathing_test, at: b.date });
  xpEvents.push({ id: 'relapse_recovery:smk_demo_1', type: 'relapse_recovery', xp: XP_RULES.relapse_recovery, at: at(9, 18).toISOString() });
  const xp = xpEvents.reduce((s, e) => s + e.xp, 0);

  return { user, cravings, smokingEvents, sessions, sleep, cough, entries, breathingTests, challenges, xpEvents, xp };
}

/** Injects the demo data into every store and flags demo mode. */
export function loadDemoData(): void {
  const data = buildDemoData();
  useUserStore.getState().setUser(data.user);
  useUserStore.getState().clearDraft();
  useCravingStore.getState().replaceAll({ cravings: data.cravings, smokingEvents: data.smokingEvents });
  useWorkoutStore.getState().replaceAll({ sessions: data.sessions, breathingTests: data.breathingTests, activeLevel: 'beginner' });
  useRewardStore.getState().replaceAll({ xp: data.xp, events: data.xpEvents, badges: [], shieldUses: [], freezes: [], bestStreakDays: 12 });
  useJournalStore.getState().replaceAll({ entries: data.entries, sleep: data.sleep, cough: data.cough, challenges: data.challenges });
  useSettingsStore.getState().setDemoMode(true);
}

export function isDemoUser(user: User | null): boolean {
  return user?.id === DEMO_USER_ID;
}
