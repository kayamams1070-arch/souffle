/**
 * Fagerström Test for Nicotine Dependence (FTND), Heatherton et al. 1991.
 * Six items, score 0-10. The wording lives in the translation files
 * (onboarding.fagerstrom.q1..q6) and follows the validated French / English / Dutch
 * versions. Points below are the published scoring.
 */
import type { DependenceLevel } from '@/types';

export interface FagerstromQuestion {
  id: 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6';
  /** Points for each answer option, in display order. */
  points: number[];
}

export const FAGERSTROM_QUESTIONS: FagerstromQuestion[] = [
  // Q1: How soon after you wake up do you smoke your first cigarette?
  // within 5 min = 3, 6-30 min = 2, 31-60 min = 1, after 60 min = 0
  { id: 'q1', points: [3, 2, 1, 0] },
  // Q2: Do you find it difficult to refrain from smoking in places where it is forbidden?
  // yes = 1, no = 0
  { id: 'q2', points: [1, 0] },
  // Q3: Which cigarette would you most hate to give up?
  // the first in the morning = 1, any other = 0
  { id: 'q3', points: [1, 0] },
  // Q4: How many cigarettes per day do you smoke?
  // 10 or fewer = 0, 11-20 = 1, 21-30 = 2, 31 or more = 3
  { id: 'q4', points: [0, 1, 2, 3] },
  // Q5: Do you smoke more frequently during the first hours after waking than during the rest of the day?
  // yes = 1, no = 0
  { id: 'q5', points: [1, 0] },
  // Q6: Do you smoke when you are so ill that you are in bed most of the day?
  // yes = 1, no = 0
  { id: 'q6', points: [1, 0] },
];

export const FAGERSTROM_MAX_SCORE = 10;

/** answers[i] = index of the chosen option for question i. */
export function computeFagerstromScore(answers: number[]): number {
  return FAGERSTROM_QUESTIONS.reduce((sum, q, i) => {
    const idx = answers[i];
    if (idx === undefined || idx < 0 || idx >= q.points.length) return sum;
    return sum + (q.points[idx] ?? 0);
  }, 0);
}

/**
 * Interpretation bands commonly used with the FTND
 * (0-2 low, 3-5 moderate, 6-7 high, 8-10 very high). This is an indicator, not a diagnosis.
 */
export function fagerstromLevel(score: number): DependenceLevel {
  if (score <= 2) return 'low';
  if (score <= 5) return 'moderate';
  if (score <= 7) return 'high';
  return 'very_high';
}

/** Suggests the Q4 option index from the declared daily consumption. */
export function fagerstromQ4IndexFromCigarettes(cigarettesPerDay: number): number {
  if (cigarettesPerDay <= 10) return 0;
  if (cigarettesPerDay <= 20) return 1;
  if (cigarettesPerDay <= 30) return 2;
  return 3;
}
