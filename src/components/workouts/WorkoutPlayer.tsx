import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppButton, AppCard, AppText, CircularTimer, ConfirmDialog, ProgressBar } from '@/components/ui';
import { useCountdown } from '@/hooks/useCountdown';
import { useHaptics } from '@/hooks/useHaptics';
import { getExercise } from '@/data/exercises';
import type { Workout } from '@/types';

export interface WorkoutResult {
  durationSeconds: number;
  blocksCompleted: number;
  totalBlocks: number;
  completed: boolean;
}

interface Props {
  workout: Workout;
  onDone: (result: WorkoutResult) => void;
  onExit: (result: WorkoutResult) => void;
  title: string;
}

type Phase = { kind: 'work' | 'rest'; blockIndex: number; seconds: number };

function buildPhases(workout: Workout): Phase[] {
  const phases: Phase[] = [];
  workout.blocks.forEach((b, i) => {
    phases.push({ kind: 'work', blockIndex: i, seconds: b.durationSeconds });
    if (b.restSeconds > 0 && i < workout.blocks.length - 1) phases.push({ kind: 'rest', blockIndex: i, seconds: b.restSeconds });
  });
  return phases;
}

/**
 * Generic timed workout player (SOS mini workout and program sessions).
 * Each phase runs on a timestamp-based countdown; the user can pause, skip, or stop.
 */
export function WorkoutPlayer({ workout, onDone, onExit, title }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const haptics = useHaptics();
  const phases = useMemo(() => buildPhases(workout), [workout]);
  const [index, setIndex] = useState(0);
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [blocksCompleted, setBlocksCompleted] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const [showEasier, setShowEasier] = useState(false);
  const phase = phases[index];
  const doneRef = useRef(false);
  const pendingAdvance = useRef(false);

  const onPhaseFinish = useCallback(() => {
    pendingAdvance.current = true;
  }, []);
  const countdown = useCountdown(phase?.seconds ?? 1, onPhaseFinish);

  const totalBlocks = workout.blocks.length;
  const totalSeconds = useMemo(() => phases.reduce((s, p) => s + p.seconds, 0), [phases]);
  const elapsedTotal = (accumulatedMs + countdown.activeMs) / 1000;

  const advance = useCallback(
    (skipped: boolean) => {
      if (!phase) return;
      const spent = countdown.activeMs;
      setAccumulatedMs((ms) => ms + spent);
      if (phase.kind === 'work' && !skipped) setBlocksCompleted((n) => n + 1);
      if (phase.kind === 'work' && skipped && countdown.progress >= 0.5) setBlocksCompleted((n) => n + 1);
      const next = index + 1;
      if (next >= phases.length) {
        if (!doneRef.current) {
          doneRef.current = true;
          haptics.success();
          const completedBlocks = blocksCompleted + (phase.kind === 'work' && (!skipped || countdown.progress >= 0.5) ? 1 : 0);
          onDone({ durationSeconds: Math.round((accumulatedMs + spent) / 1000), blocksCompleted: completedBlocks, totalBlocks, completed: true });
        }
        return;
      }
      setIndex(next);
      setShowEasier(false);
      countdown.reset(phases[next]?.seconds ?? 1);
      countdown.start();
      haptics.light();
    },
    [phase, countdown, index, phases, haptics, blocksCompleted, accumulatedMs, onDone, totalBlocks]
  );

  useEffect(() => {
    countdown.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pendingAdvance.current) {
      pendingAdvance.current = false;
      advance(false);
    }
  }, [countdown.finished, advance]);

  if (!phase) return null;
  const block = workout.blocks[phase.blockIndex];
  const exercise = block ? getExercise(block.exerciseId) : undefined;
  const nextBlock = phase.kind === 'rest' ? workout.blocks[phase.blockIndex + 1] : undefined;
  const nextExercise = nextBlock ? getExercise(nextBlock.exerciseId) : undefined;
  const exit = () => {
    const result: WorkoutResult = { durationSeconds: Math.round(elapsedTotal), blocksCompleted, totalBlocks, completed: false };
    onExit(result);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 6 }}>
          <AppText variant="h2">{title}</AppText>
          <ProgressBar value={totalSeconds ? elapsedTotal / totalSeconds : 0} accessibilityValueText={t('workout.blockOf', { current: phase.blockIndex + 1, total: totalBlocks })} />
          <AppText variant="caption" tone="secondary">
            {t('workout.blockOf', { current: phase.blockIndex + 1, total: totalBlocks })}
          </AppText>
        </View>

        <View style={{ alignItems: 'center', gap: 10 }}>
          <AppText variant="bodySmall" weight="semibold" tone={phase.kind === 'rest' ? 'accent' : 'default'} accessibilityLiveRegion="polite">
            {phase.kind === 'rest' ? t('workout.rest') : t('workout.go')}
          </AppText>
          <CircularTimer progress={countdown.progress} remainingSeconds={countdown.remainingSeconds} size={180} strokeWidth={12} tone={phase.kind === 'rest' ? 'accent' : 'primary'} />
        </View>

        {phase.kind === 'work' && exercise ? (
          <AppCard>
            <AppText variant="h3">{t(`exercises.${exercise.key}.name`)}</AppText>
            <AppText tone="secondary" style={{ marginTop: 6 }}>
              {t(`exercises.${exercise.key}.instructions`)}
            </AppText>
            {block?.repetitions ? (
              <AppText variant="bodySmall" style={{ marginTop: 6 }}>
                {t('workout.reps', { count: block.repetitions })}
              </AppText>
            ) : null}
            <AppButton label={showEasier ? t('workout.hideVariants') : t('workout.showVariants')} variant="ghost" size="sm" fullWidth={false} style={{ marginTop: 10 }} onPress={() => setShowEasier((v) => !v)} />
            {showEasier ? (
              <View style={{ gap: 6, marginTop: 6 }}>
                <AppText variant="bodySmall">
                  <AppText variant="bodySmall" weight="semibold">
                    {t('workout.easier')}:{' '}
                  </AppText>
                  {t(`exercises.${exercise.key}.easier`)}
                </AppText>
                <AppText variant="bodySmall">
                  <AppText variant="bodySmall" weight="semibold">
                    {t('workout.harder')}:{' '}
                  </AppText>
                  {t(`exercises.${exercise.key}.harder`)}
                </AppText>
                <AppText variant="bodySmall" tone="warm">
                  <AppText variant="bodySmall" weight="semibold" tone="warm">
                    {t('workout.safety')}:{' '}
                  </AppText>
                  {t(`exercises.${exercise.key}.safety`)}
                </AppText>
              </View>
            ) : null}
          </AppCard>
        ) : null}
        {phase.kind === 'rest' && nextExercise ? (
          <AppCard tone="accent">
            <AppText variant="bodySmall" tone="accent">
              {t('workout.next')}
            </AppText>
            <AppText variant="h3" tone="accent">
              {t(`exercises.${nextExercise.key}.name`)}
            </AppText>
            <AppText variant="bodySmall" tone="accent" style={{ marginTop: 4 }}>
              {t(`exercises.${nextExercise.key}.instructions`)}
            </AppText>
          </AppCard>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Ionicons name="medkit-outline" size={16} color={theme.colors.warm} />
          <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
            {t('workout.stopIfPain')}
          </AppText>
        </View>
      </ScrollView>
      <View style={{ gap: 10, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            {countdown.running ? (
              <AppButton label={t('common.pause')} variant="secondary" icon="pause" onPress={countdown.pause} />
            ) : (
              <AppButton label={t('common.resume')} variant="secondary" icon="play" onPress={countdown.resume} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <AppButton label={t('workout.skip')} variant="ghost" icon="play-skip-forward" onPress={() => advance(true)} />
          </View>
        </View>
        <AppButton label={t('workout.stop')} variant="danger" icon="stop" onPress={() => setConfirmExit(true)} />
      </View>
      <ConfirmDialog
        visible={confirmExit}
        title={t('workout.stopTitle')}
        message={t('workout.stopMessage')}
        confirmLabel={t('workout.stopConfirm')}
        cancelLabel={t('common.continue')}
        onConfirm={() => {
          setConfirmExit(false);
          exit();
        }}
        onCancel={() => setConfirmExit(false)}
      />
    </View>
  );
}
