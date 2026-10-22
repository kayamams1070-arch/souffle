import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { AppButton, AppCard, AppText, Banner, ChipGroup, NumberStepper, Screen } from '@/components/ui';
import { useSettingsStore, useUserStore } from '@/store';
import { formatCents, formatDate } from '@/utils/money';
import { dailyCostCents, habitsFromProfile, unitPriceCents, unitsPerDay } from '@/utils/calculations';
import { getProgramWeek } from '@/data/program';
import { getWorkout } from '@/data/workouts';
import { workoutDurationMinutes } from '@/services/recommendationService';
import { quitDateForChoice, type QuitChoice } from '@/utils/quitDate';

export default function GoalsStep() {
  const router = useRouter();
  const { t } = useTranslation();
  const draft = useUserStore((s) => s.draft);
  const updateDraft = useUserStore((s) => s.updateDraft);
  const language = useSettingsStore((s) => s.settings.language);
  const goal = draft.goal ?? 'quit';
  const habits = draft.smoking ? habitsFromProfile(draft.smoking) : undefined;
  const baseline = habits ? Math.max(1, unitsPerDay(habits)) : 10;
  const [choice, setChoice] = useState<QuitChoice>('now');
  const [pastDays, setPastDays] = useState(1);
  const [target, setTarget] = useState(draft.reductionTargetPerDay ?? Math.max(1, Math.round(baseline * 0.75)));
  // Use-free days are suggested by default for cannabis, optional (0) for tobacco.
  const [useFreeDays, setUseFreeDays] = useState(draft.useFreeDaysPerWeek ?? (draft.smoking?.substance && draft.smoking.substance !== 'tobacco' ? 2 : 0));

  const quitDate = useMemo(() => quitDateForChoice(choice, pastDays), [choice, pastDays]);
  const monthlySavings = habits ? Math.round(dailyCostCents(habits) * 30) : 0;
  const reductionMonthly = habits ? Math.round(Math.max(0, baseline - target) * unitPriceCents(habits) * 30) : 0;

  const level = draft.sportLevel ?? 'beginner';
  const firstWorkoutId = getProgramWeek(1)?.workoutIds[level][0];
  const firstWorkout = firstWorkoutId ? getWorkout(firstWorkoutId) : undefined;

  const onContinue = () => {
    updateDraft({
      step: 5,
      quitDate: goal === 'quit' ? quitDate : undefined,
      reductionTargetPerDay: goal === 'reduce' ? target : undefined,
      // 0 is kept in the draft so coming back to this step shows the choice; pact drops it.
      useFreeDaysPerWeek: goal === 'reduce' ? useFreeDays : undefined,
    });
    router.push('/onboarding/pact');
  };

  return (
    <Screen footer={<AppButton label={t('common.continue')} onPress={onContinue} size="lg" icon="arrow-forward" />}>
      <OnboardingHeader step={4} title={t('onboarding.goals.title')} subtitle={goal === 'quit' ? t('onboarding.goals.subtitleQuit') : t('onboarding.goals.subtitleReduce')} />

      {goal === 'quit' ? (
        <>
          <ChipGroup
            label={t('onboarding.goals.quitDate')}
            options={[
              { value: 'now', label: t('onboarding.goals.choice.now') },
              { value: 'tomorrow', label: t('onboarding.goals.choice.tomorrow') },
              { value: 'in3', label: t('onboarding.goals.choice.in3') },
              { value: 'in7', label: t('onboarding.goals.choice.in7') },
              { value: 'in14', label: t('onboarding.goals.choice.in14') },
              { value: 'past', label: t('onboarding.goals.choice.past') },
            ]}
            value={choice}
            onChange={setChoice}
            compact
          />
          {choice === 'past' ? (
            <NumberStepper label={t('onboarding.goals.pastDays')} value={pastDays} onChange={setPastDays} min={1} max={3650} unit={t('units.days')} />
          ) : null}
          <AppCard tone="primary">
            <AppText variant="bodySmall" tone="secondary">
              {t('onboarding.goals.quitDateIs')}
            </AppText>
            <AppText variant="h2">{formatDate(quitDate, language, true)}</AppText>
            <AppText variant="bodySmall" tone="secondary" style={{ marginTop: 6 }}>
              {t('onboarding.goals.monthlySavings', { amount: formatCents(monthlySavings, language) })}
            </AppText>
          </AppCard>
        </>
      ) : (
        <>
          <NumberStepper label={t('onboarding.goals.target')} value={target} onChange={setTarget} min={0} max={Math.max(0, baseline - 1)} unit={t('units.cigsPerDay')} />
          <AppCard tone="primary">
            <AppText variant="bodySmall" tone="secondary">
              {t('onboarding.goals.baseline', { count: baseline })}
            </AppText>
            <AppText variant="h2">{t('onboarding.goals.targetSummary', { target })}</AppText>
            <AppText variant="bodySmall" tone="secondary" style={{ marginTop: 6 }}>
              {t('onboarding.goals.reductionSavings', { amount: formatCents(reductionMonthly, language) })}
            </AppText>
          </AppCard>
          <NumberStepper label={t('goal.useFreeDays.label')} value={useFreeDays} onChange={setUseFreeDays} min={0} max={7} unit={t('units.days')} />
          <AppText variant="caption" tone="secondary">
            {t('goal.useFreeDays.hint')}
          </AppText>
          <Banner text={t('onboarding.goals.reduceNote')} tone="warm" />
        </>
      )}

      {firstWorkout ? (
        <AppCard title={t('onboarding.goals.firstWorkoutTitle')} tone="accent">
          <View style={{ gap: 4 }}>
            <AppText weight="semibold">{t(`workouts.${firstWorkout.key}.title`)}</AppText>
            <AppText variant="bodySmall">{t(`workouts.${firstWorkout.key}.description`)}</AppText>
            <AppText variant="caption" tone="secondary">
              {t('workout.aboutMinutes', { count: workoutDurationMinutes(firstWorkout) })} · {t(`level.${level}`)}
            </AppText>
          </View>
        </AppCard>
      ) : null}
    </Screen>
  );
}
