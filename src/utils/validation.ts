import { z } from 'zod';
import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';

export const isoDate = z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), 'invalid_date');

export const smokingProfileSchema = z.object({
  cigarettesPerDay: z.number().int().min(1).max(100),
  yearsSmoking: z.number().int().min(0).max(80),
  cigarettesPerPack: z.number().int().min(1).max(50),
  packPriceCents: z.number().int().min(1).max(100_000),
  dependenceScore: z.number().int().min(0).max(10).optional(),
  dependenceLevel: z.enum(['low', 'moderate', 'high', 'very_high']).optional(),
  fagerstromAnswers: z.array(z.number().int()).optional(),
});

export const limitationSchema = z.enum([
  'knees',
  'back',
  'shoulders',
  'wrists',
  'balance',
  'breathing',
  'no_jumping',
  'pregnancy',
  'other',
]);

export const userSchema = z.object({
  id: z.string(),
  firstName: z.string().max(40),
  age: z.number().int().min(18).max(120).optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
  smoking: smokingProfileSchema,
  goal: z.enum(['quit', 'reduce']),
  quitDate: isoDate.optional(),
  reductionTargetPerDay: z.number().int().min(0).max(100).optional(),
  reductionStartDate: isoDate.optional(),
  smokingBaselinePerDay: z.number().int().min(1).max(100),
  sportLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  intensityPreference: z.enum(['gentle', 'moderate', 'dynamic']),
  limitations: z.array(limitationSchema),
  limitationsNote: z.string().max(300).optional(),
  why: z.string().max(500),
  reasons: z.array(z.enum(['family', 'health', 'breath', 'money', 'freedom', 'children', 'other'])),
  personalPactSignedAt: isoDate.optional(),
  pactSignature: z.string().max(60).optional(),
  savingsProject: z
    .object({ title: z.string().max(80), targetCents: z.number().int().min(0).optional() })
    .optional(),
  onboardingCompleted: z.boolean(),
});

export const cravingSchema = z.object({
  id: z.string(),
  occurredAt: isoDate,
  intensity: z.number().int().min(1).max(10),
  trigger: z.enum([
    'coffee',
    'stress',
    'boredom',
    'after_meal',
    'alcohol',
    'anger',
    'social',
    'fatigue',
    'night',
    'other',
  ]),
  context: z.string().max(300).optional(),
  locationType: z.enum(['home', 'work', 'outside', 'social', 'other']).optional(),
  mood: z.enum(['calm', 'tense', 'sad', 'tired', 'irritated', 'ok']).optional(),
  interventionType: z
    .enum(['breathing', 'workout', 'distraction', 'craving_surf', 'replacement_ritual', 'none'])
    .optional(),
  interventionCompleted: z.boolean().optional(),
  outcome: z.enum(['passed', 'partly_passed', 'persisted']).optional(),
  durationSeconds: z.number().int().min(0).optional(),
  smokedAfterward: z.boolean().optional(),
});

export const smokingEventSchema = z.object({
  id: z.string(),
  occurredAt: isoDate,
  cigarettes: z.number().int().min(1).max(200),
  trigger: cravingSchema.shape.trigger.optional(),
  context: z.string().max(300).optional(),
  decision: z.enum(['continue_quit', 'new_quit_date', 'switch_to_reduce', 'reduction_log']).optional(),
  shieldUsed: z.boolean().optional(),
});

/** Form schemas (onboarding). Values arrive as strings from text inputs. */
export const profileFormSchema = z.object({
  firstName: z.string().trim().max(40),
  age: z.string().refine((v) => v === '' || (/^\d{1,3}$/.test(v) && Number(v) >= 18 && Number(v) <= 120), 'age'),
  cigarettesPerDay: z.string().refine((v) => /^\d{1,3}$/.test(v) && Number(v) >= 1 && Number(v) <= 100, 'range'),
  yearsSmoking: z.string().refine((v) => /^\d{1,2}$/.test(v) && Number(v) <= 80, 'range'),
  packPrice: z.string().refine((v) => /^\d{1,3}([.,]\d{0,2})?$/.test(v.trim()) && Number(v.replace(',', '.')) > 0, 'price'),
  cigarettesPerPack: z.string().refine((v) => /^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 50, 'range'),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

/**
 * Minimal zod resolver for react-hook-form (avoids the @hookform/resolvers dependency
 * tree). Error messages are translation keys, resolved in the component.
 */
export function zodResolver<T extends FieldValues>(schema: z.ZodType<T>): Resolver<T> {
  return async (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.map(String).join('.') || 'root';
      if (!errors[path]) errors[path] = { type: issue.code, message: issue.message };
    }
    return { values: {}, errors: errors as unknown as FieldErrors<T> };
  };
}
