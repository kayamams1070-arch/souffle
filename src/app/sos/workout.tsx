import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText, Banner, ChipGroup, Screen } from '@/components/ui';
import { WorkoutPlayer } from '@/components/workouts/WorkoutPlayer';
import { useUserStore } from '@/store';
import { useSosSession } from '@/store/useSosSession';
import { adaptWorkout, workoutDurationMinutes } from '@/services/recommendationService';
import { SOS_WORKOUT } from '@/data/workouts';
import type { IntensityPreference } from '@/types';

export default function SosWorkoutScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const session = useSosSession();
  const [intensity, setIntensity] = useState<IntensityPreference>(user?.intensityPreference ?? 'gentle');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!session.active) session.begin({ intervention: 'workout' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const workout = useMemo(() => adaptWorkout(SOS_WORKOUT, user?.limitations ?? [], intensity), [user?.limitations, intensity]);

  if (!started) {
    return (
      <Screen footer={<AppButton label={t('common.start')} size="lg" icon="play" onPress={() => setStarted(true)} />}>
        <AppText variant="h1">{t('sos.workout.title')}</AppText>
        <AppText tone="secondary">{t('sos.workout.subtitle', { count: workoutDurationMinutes(workout) })}</AppText>
        <ChipGroup
          label={t('sos.workout.intensity')}
          options={[
            { value: 'gentle', label: t('intensity.gentle') },
            { value: 'moderate', label: t('intensity.moderate') },
          ]}
          value={intensity}
          onChange={setIntensity}
        />
        {user && user.limitations.length > 0 ? <Banner text={t('sos.workout.adapted')} tone="success" /> : null}
        <Banner text={t('workout.stopIfPain')} tone="warm" icon="medkit-outline" />
        <AppButton label={t('common.back')} variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const done = (result: { durationSeconds: number; completed: boolean }) => {
    session.finish(result.durationSeconds, result.completed);
    router.replace('/sos/feedback');
  };

  return (
    <Screen scroll={false}>
      <WorkoutPlayer workout={workout} title={t('sos.workout.title')} onDone={done} onExit={done} />
    </Screen>
  );
}
