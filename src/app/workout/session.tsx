import React, { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, Screen } from '@/components/ui';
import { WorkoutPlayer, type WorkoutResult } from '@/components/workouts/WorkoutPlayer';
import { useUserStore, useWorkoutStore } from '@/store';
import { getWorkout } from '@/data/workouts';
import { adaptWorkout } from '@/services/recommendationService';

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { sessionId, workoutId, from } = useLocalSearchParams<{ sessionId: string; workoutId: string; from?: string }>();
  const user = useUserStore((s) => s.user);
  const completeSession = useWorkoutStore((s) => s.completeSession);
  const abandonSession = useWorkoutStore((s) => s.abandonSession);
  const base = workoutId ? getWorkout(workoutId) : undefined;
  const workout = useMemo(() => (base && user ? adaptWorkout(base, user.limitations, user.intensityPreference) : base), [base, user]);

  if (!workout || !sessionId) {
    return (
      <Screen>
        <EmptyState title={t('workout.notFound')} actionLabel={t('common.back')} onAction={() => router.replace('/(tabs)/sport')} />
      </Screen>
    );
  }

  const onDone = (result: WorkoutResult) => {
    completeSession(sessionId, { durationSeconds: result.durationSeconds, blocksCompleted: result.blocksCompleted });
    router.replace({ pathname: '/workout/complete', params: { sessionId, from: from ?? '' } });
  };
  const onExit = (result: WorkoutResult) => {
    // A session stopped after at least half of the blocks still counts as completed (gentle rule).
    if (result.blocksCompleted >= Math.ceil(result.totalBlocks / 2)) {
      completeSession(sessionId, { durationSeconds: result.durationSeconds, blocksCompleted: result.blocksCompleted });
      router.replace({ pathname: '/workout/complete', params: { sessionId, from: from ?? '' } });
      return;
    }
    abandonSession(sessionId, { durationSeconds: result.durationSeconds, blocksCompleted: result.blocksCompleted });
    router.replace({ pathname: '/workout/complete', params: { sessionId, from: from ?? '', abandoned: '1' } });
  };

  return (
    <Screen scroll={false}>
      <WorkoutPlayer workout={workout} title={t(`workouts.${workout.key}.title`)} onDone={onDone} onExit={onExit} />
    </Screen>
  );
}
