import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, AppCard, AppText, Banner, CircularTimer, Screen, SwitchRow } from '@/components/ui';
import { useCountdown } from '@/hooks/useCountdown';
import { useSettingsStore } from '@/store';
import { useSosSession } from '@/store/useSosSession';
import { CRAVING_SURF_SECONDS } from '@/utils/constants';
import { speak, stopSpeaking } from '@/services/audioService';

const STEPS = ['recognize', 'observe', 'breathe', 'evolve', 'choose'] as const;
const STEP_SECONDS = CRAVING_SURF_SECONDS / STEPS.length;

export default function CravingSurfScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const session = useSosSession();
  const [voice, setVoice] = useState(settings.voiceGuidanceEnabled);
  const [finished, setFinished] = useState(false);
  const spokenStep = useRef(-1);
  const onFinish = useCallback(() => setFinished(true), []);
  const countdown = useCountdown(CRAVING_SURF_SECONDS, onFinish);

  useEffect(() => {
    if (!session.active) session.begin({ intervention: 'craving_surf' });
    countdown.start();
    return () => {
      void stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepIndex = Math.min(STEPS.length - 1, Math.floor(countdown.elapsedSeconds / STEP_SECONDS));
  const step = STEPS[stepIndex]!;

  useEffect(() => {
    if (!countdown.running || spokenStep.current === stepIndex) return;
    spokenStep.current = stepIndex;
    if (voice) speak(t(`surf.steps.${step}.text`), settings.language, { rate: 0.85 });
  }, [stepIndex, step, countdown.running, voice, settings.language, t]);

  const finish = (completed: boolean) => {
    void stopSpeaking();
    session.finish(Math.round(countdown.activeMs / 1000), completed);
    router.replace('/sos/feedback');
  };

  useEffect(() => {
    if (finished) finish(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  return (
    <Screen
      footer={
        <>
          {countdown.running ? (
            <AppButton label={t('common.pause')} variant="secondary" icon="pause" onPress={() => { countdown.pause(); void stopSpeaking(); }} />
          ) : (
            <AppButton label={t('common.resume')} variant="secondary" icon="play" onPress={() => { spokenStep.current = -1; countdown.resume(); }} />
          )}
          <AppButton label={t('common.finish')} icon="checkmark" onPress={() => finish(countdown.elapsedSeconds >= CRAVING_SURF_SECONDS * 0.5)} />
        </>
      }>
      <AppText variant="h1">{t('surf.title')}</AppText>
      <AppText tone="secondary">{t('surf.subtitle')}</AppText>
      <View style={{ alignItems: 'center', marginVertical: 8 }}>
        <CircularTimer progress={countdown.progress} remainingSeconds={countdown.remainingSeconds} tone="accent" size={160} strokeWidth={10} label={t('common.remaining')} />
      </View>
      <AppCard tone="accent" accessibilityLabel={`${t('surf.stepOf', { step: stepIndex + 1, total: STEPS.length })}. ${t(`surf.steps.${step}.title`)}. ${t(`surf.steps.${step}.text`)}`}>
        <AppText variant="caption" tone="accent">
          {t('surf.stepOf', { step: stepIndex + 1, total: STEPS.length })}
        </AppText>
        <AppText variant="h2" tone="accent" accessibilityLiveRegion="polite">
          {t(`surf.steps.${step}.title`)}
        </AppText>
        <AppText tone="accent" style={{ marginTop: 6 }}>
          {t(`surf.steps.${step}.text`)}
        </AppText>
      </AppCard>
      <SwitchRow
        label={t('sos.breathing.voice')}
        description={t('surf.voiceHint')}
        value={voice}
        onChange={(v) => {
          setVoice(v);
          update({ voiceGuidanceEnabled: v });
          if (!v) void stopSpeaking();
        }}
      />
      <Banner text={t('surf.disclaimer')} />
    </Screen>
  );
}
