export type QuitGoal = 'quit' | 'reduce';

/** What the person consumes. Profiles created before the cannabis option are 'tobacco'. */
export type Substance = 'tobacco' | 'cannabis' | 'both';

/** CUDIT-R bands (Adamson et al., 2010): under 8, 8 to 11, 12 and more. */
export type CannabisUseLevel = 'low' | 'hazardous' | 'possible_disorder';

export interface CannabisProfile {
  jointsPerDay: number;
  /** Average grams of cannabis per joint, as declared by the person. */
  gramsPerJoint: number;
  pricePerGramCents: number;
  yearsUsing: number;
  /** Whether joints are usually rolled with tobacco (spliffs). */
  mixedWithTobacco?: boolean;
  cuditScore?: number;
  cuditLevel?: CannabisUseLevel;
  cuditAnswers?: number[];
}

export type SportLevel = 'beginner' | 'intermediate' | 'advanced';

/** FTND bands as published in the NIDA Common Data Elements (NIH), CDE 2195870. */
export type DependenceLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

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
  /** Defaults to 'tobacco' when missing (older profiles). */
  substance?: Substance;
  /** Cigarettes per day (0 when the person only consumes cannabis). */
  cigarettesPerDay: number;
  yearsSmoking: number;
  cigarettesPerPack: number;
  packPriceCents: number;
  dependenceScore?: number;
  dependenceLevel?: DependenceLevel;
  fagerstromAnswers?: number[];
  cannabis?: CannabisProfile;
}

/**
 * Declared habits valid from `effectiveFrom`. When the user edits consumption or price,
 * a new snapshot is appended so past savings keep using the values that applied then.
 */
export interface HabitsSnapshot {
  effectiveFrom: string;
  /** Cigarettes per day. Total consumption units = cigarettesPerDay + jointsPerDay. */
  cigarettesPerDay: number;
  cigarettesPerPack: number;
  packPriceCents: number;
  jointsPerDay?: number;
  gramsPerJoint?: number;
  pricePerGramCents?: number;
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
  /**
   * Optional weekly goal of days without any consumption (reduction goal). Recommended by
   * addiction services for cutting down cannabis (e.g. Jellinek), available for every substance.
   */
  useFreeDaysPerWeek?: number;
  /** ISO date-time when the reduction plan started (goal = reduce). */
  reductionStartDate?: string;
  /** Consumption units per day at the start (cigarettes + joints). */
  smokingBaselinePerDay: number;
  /**
   * Start of savings tracking. Set once (first quit date or reduction start) and never
   * moved forward by a relapse, a new quit date or a goal switch, so savings are never lost.
   */
  savingsStartDate?: string;
  /** Dated history of declared habits (ascending). Missing = current values since the start. */
  habitsHistory?: HabitsSnapshot[];

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
    | 'useFreeDaysPerWeek'
    | 'sportLevel'
    | 'intensityPreference'
    | 'limitations'
    | 'limitationsNote'
    | 'why'
    | 'reasons'
  >
> & { step?: number };
