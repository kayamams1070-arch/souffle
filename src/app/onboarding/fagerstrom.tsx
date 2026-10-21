import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { AppButton, AppCard, AppText, Banner, ChipGroup, Screen } from '@/components/ui';
import { useUserStore } from '@/store';
import {
  computeFagerstromScore,
  fagerstromLevel,
  fagerstromQ4IndexFromCigarettes,
  FAGERSTROM_MAX_SCORE,
  FAGERSTROM_QUESTIONS,
} from '@/utils/fagerstrom';
import { afterFagerstromRoute } from '@/utils/onboardingFlow';

export default function FagerstromStep() {
  const router = useRouter();
  const { t } = useTranslation();
  const draft = useUserStore((s) => s.draft);
  const updateDraft = useUserStore((s) => s.updateDraft);
  const initial = useMemo(() => {
    const saved = draft.smoking?.fagerstromAnswers;
    if (saved && saved.length === FAGERSTROM_QUESTIONS.length) return saved;
    const arr: (number | null)[] = FAGERSTROM_QUESTIONS.map(() => null);
    arr[3] = fagerstromQ4IndexFromCigarettes(draft.smoking?.cigarettesPerDay ?? 0);
    return arr;
  }, [draft.smoking]);
  const [answers, setAnswers] = useState<(number | null)[]>(initial);
  const complete = answers.every((a) => a !== null);
  const score = complete ? computeFagerstromScore(answers as number[]) : null;
  const level = score === null ? null : fagerstromLevel(score);

  const onContinue = () => {
    if (!complete || score === null || !level) return;
    updateDraft({
      step: draft.smoking?.substance === 'both' ? 2 : 3,
      smoking: {
        ...draft.smoking,
        cigarettesPerDay: draft.smoking?.cigarettesPerDay ?? 1,
        yearsSmoking: draft.smoking?.yearsSmoking ?? 0,
        cigarettesPerPack: draft.smoking?.cigarettesPerPack ?? 20,
        packPriceCents: draft.smoking?.packPriceCents ?? 0,
        fagerstromAnswers: answers as number[],
        dependenceScore: score,
        dependenceLevel: level,
      },
    });
    router.push(afterFagerstromRoute(draft.smoking?.substance));
  };

  return (
    <Screen footer={<AppButton label={t('common.continue')} onPress={onContinue} size="lg" icon="arrow-forward" disabled={!complete} />}>
      <OnboardingHeader step={2} title={t('onboarding.fagerstrom.title')} subtitle={t('onboarding.fagerstrom.subtitle')} />
      {FAGERSTROM_QUESTIONS.map((q, i) => (
        <AppCard key={q.id}>
          <AppText weight="semibold" style={{ marginBottom: 10 }}>
            {i + 1}. {t(`onboarding.fagerstrom.${q.id}.question`)}
          </AppText>
          <ChipGroup
            options={q.points.map((_, idx) => ({ value: idx, label: t(`onboarding.fagerstrom.${q.id}.a${idx}`) }))}
            value={answers[i]}
            onChange={(idx) => setAnswers((prev) => prev.map((a, j) => (j === i ? idx : a)))}
            compact
          />
        </AppCard>
      ))}
      {score !== null && level ? (
        <AppCard tone="primary" title={t('onboarding.fagerstrom.resultTitle', { score, max: FAGERSTROM_MAX_SCORE })}>
          <View style={{ gap: 8 }}>
            <AppText weight="semibold">{t(`dependence.${level}`)}</AppText>
            <AppText variant="bodySmall">{t(`onboarding.fagerstrom.interpretation.${level}`)}</AppText>
          </View>
        </AppCard>
      ) : null}
      <Banner text={t('onboarding.fagerstrom.disclaimer')} />
    </Screen>
  );
}
