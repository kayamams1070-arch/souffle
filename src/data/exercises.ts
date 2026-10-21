import type { ExerciseDefinition } from '@/types';

/**
 * Exercise library. Texts live in i18n under exercises.<key>.{name,instructions,easier,harder,safety}.
 * `contraindications` lists declared limitations for which the exercise is swapped for
 * its `lowImpactAlternative` (recommendationService.adaptWorkout).
 */
export const EXERCISES: ExerciseDefinition[] = [
  { id: 'march', key: 'march', category: 'cardio', difficulty: 1, contraindications: [] },
  { id: 'arm_circles', key: 'arm_circles', category: 'warmup', difficulty: 1, contraindications: ['shoulders'], lowImpactAlternative: 'neck_rolls' },
  { id: 'neck_rolls', key: 'neck_rolls', category: 'warmup', difficulty: 1, contraindications: [] },
  { id: 'chair_squat', key: 'chair_squat', category: 'strength', difficulty: 1, contraindications: ['knees'], lowImpactAlternative: 'seated_leg_extension' },
  { id: 'seated_leg_extension', key: 'seated_leg_extension', category: 'strength', difficulty: 1, contraindications: [] },
  { id: 'squat', key: 'squat', category: 'strength', difficulty: 2, contraindications: ['knees', 'back', 'pregnancy'], lowImpactAlternative: 'chair_squat' },
  { id: 'wall_pushup', key: 'wall_pushup', category: 'strength', difficulty: 1, contraindications: ['wrists', 'shoulders'], lowImpactAlternative: 'shoulder_mobility' },
  { id: 'incline_pushup', key: 'incline_pushup', category: 'strength', difficulty: 2, contraindications: ['wrists', 'shoulders', 'pregnancy'], lowImpactAlternative: 'wall_pushup' },
  { id: 'plank_knees', key: 'plank_knees', category: 'strength', difficulty: 2, contraindications: ['wrists', 'shoulders', 'back', 'pregnancy'], lowImpactAlternative: 'dead_bug' },
  { id: 'side_plank_knees', key: 'side_plank_knees', category: 'strength', difficulty: 2, contraindications: ['wrists', 'shoulders', 'back', 'pregnancy'], lowImpactAlternative: 'dead_bug' },
  { id: 'dead_bug', key: 'dead_bug', category: 'strength', difficulty: 1, contraindications: [] },
  { id: 'high_knees', key: 'high_knees', category: 'cardio', difficulty: 2, contraindications: ['knees', 'balance', 'breathing', 'no_jumping', 'pregnancy'], lowImpactAlternative: 'march', involvesJumping: true },
  { id: 'jumping_jacks', key: 'jumping_jacks', category: 'cardio', difficulty: 3, contraindications: ['knees', 'back', 'balance', 'breathing', 'no_jumping', 'pregnancy'], lowImpactAlternative: 'step_jacks', involvesJumping: true },
  { id: 'step_jacks', key: 'step_jacks', category: 'cardio', difficulty: 1, contraindications: [] },
  { id: 'lunge', key: 'lunge', category: 'strength', difficulty: 2, contraindications: ['knees', 'balance', 'pregnancy'], lowImpactAlternative: 'chair_squat' },
  { id: 'glute_bridge', key: 'glute_bridge', category: 'strength', difficulty: 1, contraindications: ['pregnancy'], lowImpactAlternative: 'chair_squat' },
  { id: 'shoulder_mobility', key: 'shoulder_mobility', category: 'mobility', difficulty: 1, contraindications: [] },
  { id: 'hip_stretch', key: 'hip_stretch', category: 'mobility', difficulty: 1, contraindications: [] },
  { id: 'hamstring_stretch', key: 'hamstring_stretch', category: 'mobility', difficulty: 1, contraindications: [] },
  { id: 'cat_cow', key: 'cat_cow', category: 'mobility', difficulty: 1, contraindications: ['wrists'], lowImpactAlternative: 'seated_twist' },
  { id: 'seated_twist', key: 'seated_twist', category: 'mobility', difficulty: 1, contraindications: [] },
  { id: 'child_pose', key: 'child_pose', category: 'mobility', difficulty: 1, contraindications: ['knees', 'pregnancy'], lowImpactAlternative: 'seated_forward_fold' },
  { id: 'seated_forward_fold', key: 'seated_forward_fold', category: 'mobility', difficulty: 1, contraindications: [] },
  { id: 'mountain_climber_slow', key: 'mountain_climber_slow', category: 'cardio', difficulty: 3, contraindications: ['wrists', 'shoulders', 'back', 'knees', 'pregnancy'], lowImpactAlternative: 'march' },
  { id: 'calf_raise', key: 'calf_raise', category: 'strength', difficulty: 1, contraindications: ['balance'], lowImpactAlternative: 'seated_leg_extension' },
  { id: 'recovery_breathing', key: 'recovery_breathing', category: 'breathing', difficulty: 1, contraindications: [] },
  { id: 'box_breathing_soft', key: 'box_breathing_soft', category: 'breathing', difficulty: 1, contraindications: [] },
  { id: 'shadow_boxing', key: 'shadow_boxing', category: 'cardio', difficulty: 2, contraindications: ['shoulders', 'wrists'], lowImpactAlternative: 'march' },
  { id: 'standing_balance', key: 'standing_balance', category: 'mobility', difficulty: 1, contraindications: ['balance'], lowImpactAlternative: 'seated_leg_extension' },
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): ExerciseDefinition | undefined {
  return BY_ID.get(id);
}
