import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppButton, AppCard, AppText, Banner, ScaleSelector, Screen, TextField } from '@/components/ui';
import { useRewardStore, useWorkoutStore } from '@/store';
import { useSosSession } from '@/store/useSosSession';
import { xpEventId } from '@/services/rewardService';
import { useHaptics } from '@/hooks/useHaptics';
import { formatMinutesAsClock } from '@/utils/dates';

export default function WorkoutCompleteScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const haptics = useHaptics();
  const { sessionId, from, abandoned } = useLocalSearchParams<{ sessionId: string; from?: string; abandoned?: string }>();
  const session = useWorkoutStore((s) => s.sessions.find((x) => x.id === sessionId));
  const annotateSession = useWorkoutStore((s) => s.annotateSession);
  const awardXp = useRewardStore((s) => s.awardXp);
  const sos = useSosSession();
  const [effort, setEffort] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [xp, setXp] = useState<number | null>(null);

  useEffect(() => {
    if (session?.completed && xp === null) {
      const gained = awardXp(xpEventId.workout(session.id), 'workout_completed');
      setXp(gained);
      if (gained > 0) haptics.success();
    }
  }, [session, awardXp, xp, haptics]);

  if (!session) return null;
  const isAbandoned = abandoned === '1' || !session.completed;

  const finish = () => {
    if (session.completed && (effort || notes.trim())) {
      annotateSession(session.id, { perceivedEffort: effort ?? undefined, notes: notes.trim() || undefined });
    }
    if (from === 'sos') {
      sos.finish(session.durationSeconds, session.completed);
      router.replace('/sos/feedback');
      return;
    }
    router.replace('/(tabs)/sport');
  };

  return (
    <Screen footer={<AppButton label={from === 'sos' ? t('common.continue') : t('common.done')} icon="checkmark" onPress={finish} />}>
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 24 }}>
        <Ionicons name={isAbandoned ? 'leaf-outline' : 'trophy'} size={64} color={isAbandoned ? theme.colors.accent : theme.colors.warm} />
        <AppText variant="h1" align="center">
          {isAbandoned ? t('workout.complete.abandonedTitle') : t('workout.complete.title')}
        </AppText>
        <AppText tone="secondary" align="center">
          {isAbandoned ? t('workout.complete.abandonedText') : t('workout.complete.text')}
        </AppText>
        {xp ? (
          <AppText weight="bold" tone="warm" variant="h3">
            +{xp} XP
          </AppText>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <AppCard style={{ flex: 1 }} tone="primary">
          <AppText variant="caption" tone="secondary">
            {t('workout.duration')}
          </AppText>
          <AppText variant="h2">{formatMinutesAsClock(session.durationSeconds)}</AppText>
        </AppCard>
        <AppCard style={{ flex: 1 }} tone="primary">
          <AppText variant="caption" tone="secondary">
            {t('workout.exercises')}
          </AppText>
          <AppText variant="h2">
            {session.blocksCompleted}/{session.totalBlocks}
          </AppText>
        </AppCard>
      </View>
      {session.completed ? (
        <>
          <ScaleSelector label={t('workout.complete.effort')} value={effort} onChange={setEffort} min={1} max={5} minLabel={t('workout.complete.effortLow')} maxLabel={t('workout.complete.effortHigh')} />
          <TextField label={t('workout.complete.notes')} value={notes} onChangeText={setNotes} maxLength={300} multiline />
        </>
      ) : (
        <Banner text={t('workout.complete.noPressure')} tone="success" />
      )}
    </Screen>
  );
}
