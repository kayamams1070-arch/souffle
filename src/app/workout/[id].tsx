import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, AppCard, AppText, Banner, EmptyState, ListRow, Screen, ScreenHeader } from '@/components/ui';
import { useUserStore, useWorkoutStore } from '@/store';
import { getWorkout } from '@/data/workouts';
import { getExercise } from '@/data/exercises';
import { adaptWorkout, effectiveLevel, workoutDurationMinutes } from '@/services/recommendationService';

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const user = useUserStore((s) => s.user);
  const sessions = useWorkoutStore((s) => s.sessions);
  const activeLevel = useWorkoutStore((s) => s.activeLevel);
  const startSession = useWorkoutStore((s) => s.startSession);
  const base = id ? getWorkout(id) : undefined;
  const workout = useMemo(() => (base && user ? adaptWorkout(base, user.limitations, user.intensityPreference) : base), [base, user]);

  if (!workout || !user) {
    return (
      <Screen>
        <ScreenHeader title={t('workout.notFound')} />
        <EmptyState title={t('workout.notFound')} actionLabel={t('common.back')} onAction={() => router.back()} />
      </Screen>
    );
  }
  const adaptedCount = base ? workout.blocks.filter((b, i) => b.exerciseId !== base.blocks[i]?.exerciseId).length : 0;
  const level = effectiveLevel(user, sessions, activeLevel);

  const start = () => {
    const session = startSession(workout.id, workout.level === 'beginner' && workout.weekNumber === 0 ? level : workout.level, workout.blocks.length);
    router.replace({ pathname: '/workout/session', params: { sessionId: session.id, workoutId: workout.id, from: from ?? '' } });
  };

  return (
    <Screen footer={<AppButton label={t('common.start')} size="lg" icon="play" onPress={start} />}>
      <ScreenHeader title={t(`workouts.${workout.key}.title`)} subtitle={t(`workouts.${workout.key}.description`)} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <AppCard tone="primary" style={{ flex: 1 }}>
          <AppText variant="caption" tone="secondary">
            {t('workout.duration')}
          </AppText>
          <AppText variant="h2">{t('workout.aboutMinutes', { count: workoutDurationMinutes(workout) })}</AppText>
        </AppCard>
        <AppCard tone="primary" style={{ flex: 1 }}>
          <AppText variant="caption" tone="secondary">
            {t('workout.level')}
          </AppText>
          <AppText variant="h2">{t(`level.${workout.weekNumber === 0 ? level : workout.level}`)}</AppText>
        </AppCard>
      </View>
      {adaptedCount > 0 ? <Banner text={t('workout.adaptedCount', { count: adaptedCount })} tone="success" icon="shield-checkmark-outline" /> : null}
      <AppCard title={t('workout.exercises')}>
        {workout.blocks.map((b, i) => {
          const ex = getExercise(b.exerciseId);
          if (!ex) return null;
          return (
            <ListRow key={`${b.exerciseId}-${i}`} icon={ex.category === 'breathing' ? 'cloud-outline' : ex.category === 'mobility' || ex.category === 'cooldown' ? 'leaf-outline' : ex.category === 'warmup' ? 'sunny-outline' : 'fitness-outline'} title={t(`exercises.${ex.key}.name`)} subtitle={`${b.durationSeconds}s${b.restSeconds ? ` + ${b.restSeconds}s ${t('workout.restShort')}` : ''} · ${t(`exercises.${ex.key}.instructions`)}`} chevron={false} />
          );
        })}
      </AppCard>
      <Banner text={t('workout.stopIfPain')} tone="warm" icon="medkit-outline" />
    </Screen>
  );
}
