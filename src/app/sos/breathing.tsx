import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText, CircularTimer, Screen, SwitchRow } from '@/components/ui';
import { BreathingCircle, type BreathPhase } from '@/components/sos/BreathingCircle';
import { useCountdown } from '@/hooks/useCountdown';
import { useHaptics } from '@/hooks/useHaptics';
import { useSettingsStore } from '@/store';
import { useSosSession } from '@/store/useSosSession';
import { BREATH_PATTERN, SOS_BREATHING_SECONDS } from '@/utils/constants';
import { speak, stopSpeaking } from '@/services/audioService';

const CYCLE_MS = (BREATH_PATTERN.inhaleSeconds + BREATH_PATTERN.exhaleSeconds) * 1000;

export default function BreathingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const haptics = useHaptics();
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const session = useSosSession();
  const [voice, setVoice] = useState(settings.voiceGuidanceEnabled);
  const [finishedByTimer, setFinishedByTimer] = useState(false);
  const lastPhase = useRef<BreathPhase>('idle');

  const onFinish = useCallback(() => setFinishedByTimer(true), []);
  const countdown = useCountdown(SOS_BREATHING_SECONDS, onFinish);

  useEffect(() => {
    if (!session.active) session.begin({ intervention: 'breathing' });
    countdown.start();
    return () => {
      void stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { phase, phaseMs, phaseProgress } = useMemo(() => {
    if (!countdown.running && countdown.activeMs === 0) return { phase: 'idle' as BreathPhase, phaseMs: 1000, phaseProgress: 0 };
    const inCycle = countdown.activeMs % CYCLE_MS;
    const inhaleMs = BREATH_PATTERN.inhaleSeconds * 1000;
    if (inCycle < inhaleMs) return { phase: 'inhale' as BreathPhase, phaseMs: inhaleMs, phaseProgress: inCycle / inhaleMs };
    const exhaleMs = BREATH_PATTERN.exhaleSeconds * 1000;
    return { phase: 'exhale' as BreathPhase, phaseMs: exhaleMs, phaseProgress: (inCycle - inhaleMs) / exhaleMs };
  }, [countdown.activeMs, countdown.running]);

  // Haptic + voice cue at each phase change.
  useEffect(() => {
    if (phase === lastPhase.current || !countdown.running) return;
    lastPhase.current = phase;
    if (phase === 'inhale') haptics.light();
    if (phase === 'exhale') haptics.medium();
    if (voice && phase !== 'idle') speak(t(`sos.breathing.${phase}`), settings.language, { rate: 0.85 });
  }, [phase, countdown.running, haptics, voice, settings.language, t]);

  const finish = (completed: boolean) => {
    void stopSpeaking();
    session.finish(Math.round(countdown.activeMs / 1000), completed);
    router.replace('/sos/feedback');
  };

  useEffect(() => {
    if (finishedByTimer) {
      haptics.success();
      finish(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishedByTimer]);

  const label = phase === 'inhale' ? t('sos.breathing.inhale') : phase === 'exhale' ? t('sos.breathing.exhale') : t('sos.breathing.ready');

  return (
    <Screen
      scroll={false}
      footer={
        <>
          {countdown.running ? (
            <AppButton label={t('common.pause')} variant="secondary" icon="pause" onPress={countdown.pause} />
          ) : (
            <AppButton label={t('common.resume')} variant="secondary" icon="play" onPress={countdown.resume} />
          )}
          <AppButton label={t('common.finish')} variant="primary" icon="checkmark" onPress={() => finish(countdown.elapsedSeconds >= SOS_BREATHING_SECONDS * 0.5)} />
        </>
      }>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <AppText variant="h2" align="center">
            {t('sos.breathing.title')}
          </AppText>
          <AppText tone="secondary" align="center">
            {t('sos.breathing.hint', { inhale: BREATH_PATTERN.inhaleSeconds, exhale: BREATH_PATTERN.exhaleSeconds })}
          </AppText>
        </View>
        <BreathingCircle phase={phase} phaseMs={phaseMs} phaseProgress={phaseProgress} label={label} running={countdown.running} />
        <CircularTimer progress={countdown.progress} remainingSeconds={countdown.remainingSeconds} size={110} strokeWidth={8} label={t('common.remaining')} />
        <View style={{ alignSelf: 'stretch' }}>
          <SwitchRow
            label={t('sos.breathing.voice')}
            value={voice}
            onChange={(v) => {
              setVoice(v);
              update({ voiceGuidanceEnabled: v });
              if (!v) void stopSpeaking();
            }}
          />
          <SwitchRow label={t('settings.haptics')} value={settings.hapticsEnabled} onChange={(v) => update({ hapticsEnabled: v })} />
          <AppText variant="caption" tone="secondary" align="center">
            {t('sos.breathing.comfort')}
          </AppText>
        </View>
      </View>
    </Screen>
  );
}
