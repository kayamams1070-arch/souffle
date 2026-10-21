export type QuitGoal = 'quit' | 'reduce';

export type SportLevel = 'beginner' | 'intermediate' | 'advanced';

export type DependenceLevel = 'low' | 'moderate' | 'high' | 'very_high';

export type IntensityPreference = 'gentle' | 'moderate' | 'dynamic';

/** Limitations the user can declare. They only drive exercise filtering, never a diagnosis. */
export type Limitation =
  | 'knees'
  | 'back'
  | 'shoulders'
  | 'wrists'
  | 'balance'
  | 'breathing'
  | 'no_jumping'
  | 'pregnancy'
  | 'other';

export type QuitReason = 'family' | 'health' | 'breath' | 'money' | 'freedom' | 'children' | 'other';

export interface BreathingTest {
  id: string;
  date: string;
  /** Protocol identifier so results stay comparable over time. */
  protocol: 'souffle_v1';
  /** Seconds of comfortable slow exhale the user declared (self reported, non medical). */
  exhaleSeconds: number;
  /** Perceived effort 1 (very easy) to 5 (very hard) after the 30-second march. */
  perceivedEffort: number;
  /** Self-reported breathlessness 0 (none) to 10 (very strong). */
  breathlessness: number;
  note?: string;
}

export interface SmokingProfile {
  cigarettesPerDay: number;
  yearsSmoking: number;
  cigarettesPerPack: number;
  packPriceCents: number;
  dependenceScore?: number;
  dependenceLevel?: DependenceLevel;
  fagerstromAnswers?: number[];
}

export interface User {
  id: string;
  firstName: string;
  age?: number;
  createdAt: string;
  updatedAt: string;

  smoking: SmokingProfile;

  goal: QuitGoal;
  /** ISO date-time of the chosen quit moment (goal = quit). */
  quitDate?: string;
  /** Daily target for the reduction goal. */
  reductionTargetPerDay?: number;
  /** ISO date-time when the reduction plan started (goal = reduce). */
  reductionStartDate?: string;
  smokingBaselinePerDay: number;

  sportLevel: SportLevel;
  intensityPreference: IntensityPreference;
  limitations: Limitation[];
  limitationsNote?: string;

  why: string;
  reasons: QuitReason[];
  personalPactSignedAt?: string;
  pactSignature?: string;

  /** Optional personal savings project (what the saved money is for). */
  savingsProject?: {
    title: string;
    targetCents?: number;
  };

  onboardingCompleted: boolean;
}

/** Draft kept while the onboarding is in progress so the user can resume it. */
export type OnboardingDraft = Partial<
  Pick<
    User,
    | 'firstName'
    | 'age'
    | 'smoking'
    | 'goal'
    | 'quitDate'
    | 'reductionTargetPerDay'
    | 'sportLevel'
    | 'intensityPreference'
    | 'limitations'
    | 'limitationsNote'
    | 'why'
    | 'reasons'
  >
> & { step?: number };
