/**
 * Cannabis Use Disorder Identification Test – Revised (CUDIT-R), Adamson et al. 2010,
 * Drug and Alcohol Dependence 110:137-143. Eight items, score 0-32. The wording lives in
 * the translation files (onboarding.cudit.q1..q8); the points below are the published
 * scoring. It screens for problematic use and is never a diagnosis.
 */
import type { CannabisUseLevel } from '@/types';

export interface CuditQuestion {
  id: 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'q8';
  /** Points for each answer option, in display order. */
  points: number[];
}

const FREQUENCY = [0, 1, 2, 3, 4];

export const CUDIT_QUESTIONS: CuditQuestion[] = [
  // Q1: How often do you use cannabis?
  // never / monthly or less / 2-4 times a month / 2-3 times a week / 4 or more times a week
  { id: 'q1', points: FREQUENCY },
  // Q2: How many hours were you "stoned" on a typical day when you had been using cannabis?
  // less than 1 / 1 or 2 / 3 or 4 / 5 or 6 / 7 or more
  { id: 'q2', points: FREQUENCY },
  // Q3-Q7, past 6 months: never / less than monthly / monthly / weekly / daily or almost daily
  // Q3: not able to stop once started
  { id: 'q3', points: FREQUENCY },
  // Q4: failed to do what was normally expected because of using cannabis
  { id: 'q4', points: FREQUENCY },
  // Q5: devoted a great deal of time to getting, using or recovering from cannabis
  { id: 'q5', points: FREQUENCY },
  // Q6: problem with memory or concentration after using cannabis
  { id: 'q6', points: FREQUENCY },
  // Q7: use in physically hazardous situations (driving, machinery, caring for children)
  { id: 'q7', points: FREQUENCY },
  // Q8: Have you ever thought about cutting down, or stopping, your use of cannabis?
  // never / yes, but not in the past 6 months / yes, during the past 6 months
  { id: 'q8', points: [0, 2, 4] },
];

export const CUDIT_MAX_SCORE = 32;

/** answers[i] = index of the chosen option for question i. */
export function computeCuditScore(answers: number[]): number {
  return CUDIT_QUESTIONS.reduce((sum, q, i) => {
    const idx = answers[i];
    if (idx === undefined || idx < 0 || idx >= q.points.length) return sum;
    return sum + (q.points[idx] ?? 0);
  }, 0);
}

/** Published cut-offs: 8 or more = hazardous use, 12 or more = possible cannabis use disorder. */
export function cuditLevel(score: number): CannabisUseLevel {
  if (score >= 12) return 'possible_disorder';
  if (score >= 8) return 'hazardous';
  return 'low';
}

/** Suggests the Q1 answer from the declared consumption (joints per day ≥ 1 means daily use). */
export function cuditQ1IndexFromJoints(jointsPerDay: number): number | null {
  return jointsPerDay >= 1 ? 4 : null;
}
