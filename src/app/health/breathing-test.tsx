import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, AppCard, AppText, Banner, CircularTimer, NumberStepper, ScaleSelector, Screen, ScreenHeader } from '@/components/ui';
import { LineChart } from '@/components/charts/BarChart';
import { useCountdown } from '@/hooks/useCountdown';
import { useRewardStore, useSettingsStore, useWorkoutStore } from '@/store';
import { xpEventId } from '@/services/rewardService';
import { formatDate } from '@/utils/money';
import { dayKey, daysBetweenKeys, nowIso } from '@/utils/dates';

type Step = 'intro' | 'calm' | 'march' | 'rate' | 'exhale' | 'done';
const CALM_SECONDS = 30;
const MARCH_SECONDS = 30;

export default function BreathingTestScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const tests = useWorkoutStore((s) => s.breathingTests);
  const addBreathingTest = useWorkoutStore((s) => s.addBreathingTest);
  const awardXp = useRewardStore((s) => s.awardXp);
  const language = useSettingsStore((s) => s.settings.language);
  const [step, setStep] = useState<Step>('intro');
  const [effort, setEffort] = useState<number | null>(null);
  const [breathlessness, setBreathlessness] = useState<number | null>(null);
  const [exhale, setExhale] = useState(6);
  const [savedId, setSavedId] = useState<string | null>(null);

  const onCalmDone = useCallback(() => setStep('march'), []);
  const onMarchDone = useCallback(() => setStep('rate'), []);
  const calm = useCountdown(CALM_SECONDS, onCalmDone);
  const march = useCountdown(MARCH_SECONDS, onMarchDone);

  const last = tests[tests.length - 1];
  const daysSinceLast = last ? daysBetweenKeys(dayKey(last.date), dayKey()) : null;

  const save = () => {
    const test = addBreathingTest({ date: nowIso(), protocol: 'souffle_v1', exhaleSeconds: exhale, perceivedEffort: effort ?? 3, breathlessness: breathlessness ?? 5 });
    awardXp(xpEventId.breathingTest(test.id), 'breathing_test');
    setSavedId(test.id);
    setStep('done');
  };

  const chartData = useMemo(() => tests.slice(-8).map((x) => ({ label: x.date.slice(5, 10), value: x.breathlessness })), [tests]);

  return (
    <Screen>
      <ScreenHeader title={t('breathingTest.title')} subtitle={t('breathingTest.subtitle')} />
      {step === 'intro' ? (
        <>
          <Banner text={t('breathingTest.notMedical')} tone="warm" icon="medkit-outline" />
          <AppCard title={t('breathingTest.protocolTitle')}>
            {['calm', 'march', 'rate', 'exhale'].map((k, i) => (
              <AppText key={k} variant="bodySmall" style={{ marginBottom: 6 }}>
                {i + 1}. {t(`breathingTest.protocol.${k}`)}
              </AppText>
            ))}
          </AppCard>
          {last ? (
            <AppCard tone="alt">
              <AppText variant="bodySmall" tone="secondary">
                {t('breathingTest.lastTest', { date: formatDate(last.date, language) })}
                {daysSinceLast !== null && daysSinceLast >= 14 ? ` ${t('breathingTest.dueAgain')}` : daysSinceLast !== null ? ` ${t('breathingTest.nextIn', { count: Math.max(0, 14 - daysSinceLast) })}` : ''}
              </AppText>
            </AppCard>
          ) : null}
          {tests.length >= 2 ? (
            <AppCard title={t('breathingTest.history')} subtitle={t('breathingTest.historyHint')}>
              <LineChart data={chartData} min={0} max={10} summary={t('breathingTest.chartSummary', { first: tests[0]?.breathlessness ?? 0, last: last?.breathlessness ?? 0 })} />
            </AppCard>
          ) : null}
          <AppButton label={t('breathingTest.start')} icon="play" onPress={() => { setStep('calm'); calm.start(); }} />
        </>
      ) : null}
      {step === 'calm' ? (
        <View style={{ alignItems: 'center', gap: 16 }}>
          <AppText variant="h2" align="center">
            {t('breathingTest.protocol.calm')}
          </AppText>
          <CircularTimer progress={calm.progress} remainingSeconds={calm.remainingSeconds} size={180} strokeWidth={12} />
          <AppButton label={t('breathingTest.skipStep')} variant="ghost" onPress={() => setStep('march')} />
        </View>
      ) : null}
      {step === 'march' ? (
        <View style={{ alignItems: 'center', gap: 16 }}>
          <AppText variant="h2" align="center">
            {t('breathingTest.protocol.march')}
          </AppText>
          {!march.running && march.activeMs === 0 ? <AppButton label={t('common.start')} icon="play" onPress={march.start} /> : <CircularTimer progress={march.progress} remainingSeconds={march.remainingSeconds} size={180} strokeWidth={12} tone="accent" />}
          <AppText variant="caption" tone="secondary" align="center">
            {t('breathingTest.marchHint')}
          </AppText>
        </View>
      ) : null}
      {step === 'rate' ? (
        <>
          <ScaleSelector label={t('breathingTest.effort')} value={effort} onChange={setEffort} min={1} max={5} minLabel={t('workout.complete.effortLow')} maxLabel={t('workout.complete.effortHigh')} />
          <ScaleSelector label={t('breathingTest.breathlessness')} value={breathlessness} onChange={setBreathlessness} min={0} max={10} minLabel={t('breathingTest.none')} maxLabel={t('breathingTest.strong')} />
          <AppButton label={t('common.continue')} icon="arrow-forward" disabled={effort === null || breathlessness === null} onPress={() => setStep('exhale')} />
        </>
      ) : null}
      {step === 'exhale' ? (
        <>
          <AppText>{t('breathingTest.protocol.exhale')}</AppText>
          <Banner text={t('breathingTest.exhaleSafety')} tone="warm" />
          <NumberStepper label={t('breathingTest.exhaleSeconds')} value={exhale} onChange={setExhale} min={1} max={30} unit={t('units.s')} />
          <AppButton label={t('common.save')} icon="checkmark" onPress={save} />
        </>
      ) : null}
      {step === 'done' && savedId ? (
        <>
          <AppCard tone="accent" title={t('breathingTest.savedTitle')}>
            <AppText tone="accent">{t('breathingTest.savedText')}</AppText>
            {last && tests.length >= 2 ? (
              <AppText variant="bodySmall" tone="accent" style={{ marginTop: 6 }}>
                {t('breathingTest.comparison', { prev: tests[tests.length - 2]?.breathlessness ?? 0, now: tests[tests.length - 1]?.breathlessness ?? 0 })}
              </AppText>
            ) : null}
          </AppCard>
          <AppButton label={t('common.done')} onPress={() => router.back()} />
        </>
      ) : null}
    </Screen>
  );
}
