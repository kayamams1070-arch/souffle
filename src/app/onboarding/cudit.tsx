import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { AppButton, AppCard, AppText, Banner, ChipGroup, Screen } from '@/components/ui';
import { useUserStore } from '@/store';
import { computeCuditScore, cuditLevel, cuditQ1IndexFromJoints, CUDIT_MAX_SCORE, CUDIT_QUESTIONS } from '@/utils/cudit';

export default function CuditStep() {
  const router = useRouter();
  const { t } = useTranslation();
  const draft = useUserStore((s) => s.draft);
  const updateDraft = useUserStore((s) => s.updateDraft);
  const cannabis = draft.smoking?.cannabis;
  const initial = useMemo(() => {
    const saved = cannabis?.cuditAnswers;
    if (saved && saved.length === CUDIT_QUESTIONS.length) return saved;
    const arr: (number | null)[] = CUDIT_QUESTIONS.map(() => null);
    arr[0] = cuditQ1IndexFromJoints(cannabis?.jointsPerDay ?? 0);
    return arr;
  }, [cannabis]);
  const [answers, setAnswers] = useState<(number | null)[]>(initial);
  const complete = answers.every((a) => a !== null);
  const score = complete ? computeCuditScore(answers as number[]) : null;
  const level = score === null ? null : cuditLevel(score);

  const onContinue = () => {
    if (!complete || score === null || !level || !draft.smoking || !cannabis) return;
    updateDraft({
      step: 3,
      smoking: {
        ...draft.smoking,
        cannabis: { ...cannabis, cuditAnswers: answers as number[], cuditScore: score, cuditLevel: level },
      },
    });
    router.push('/onboarding/health');
  };

  return (
    <Screen footer={<AppButton label={t('common.continue')} onPress={onContinue} size="lg" icon="arrow-forward" disabled={!complete} />}>
      <OnboardingHeader step={2} title={t('onboarding.cudit.title')} subtitle={t('onboarding.cudit.subtitle')} />
      {CUDIT_QUESTIONS.map((q, i) => (
        <AppCard key={q.id}>
          <AppText weight="semibold" style={{ marginBottom: 10 }}>
            {i + 1}. {t(`onboarding.cudit.${q.id}.question`)}
          </AppText>
          <ChipGroup
            options={q.points.map((_, idx) => ({ value: idx, label: t(`onboarding.cudit.${q.id}.a${idx}`) }))}
            value={answers[i]}
            onChange={(idx) => setAnswers((prev) => prev.map((a, j) => (j === i ? idx : a)))}
            compact
          />
        </AppCard>
      ))}
      {score !== null && level ? (
        <AppCard tone="primary" title={t('onboarding.cudit.resultTitle', { score, max: CUDIT_MAX_SCORE })}>
          <View style={{ gap: 8 }}>
            <AppText weight="semibold">{t(`cannabisUse.${level}`)}</AppText>
            <AppText variant="bodySmall">{t(`onboarding.cudit.interpretation.${level}`)}</AppText>
          </View>
        </AppCard>
      ) : null}
      <Banner text={t('onboarding.cudit.disclaimer')} />
    </Screen>
  );
}
