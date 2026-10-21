import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { AppButton, Banner, ChipGroup, Screen, TextField } from '@/components/ui';
import { useUserStore } from '@/store';
import type { IntensityPreference, Limitation, SportLevel } from '@/types';
import { LIMITATION_OPTIONS } from '@/data/limitations';

export default function HealthStep() {
  const router = useRouter();
  const { t } = useTranslation();
  const draft = useUserStore((s) => s.draft);
  const updateDraft = useUserStore((s) => s.updateDraft);
  const [level, setLevel] = useState<SportLevel>(draft.sportLevel ?? 'beginner');
  const [intensity, setIntensity] = useState<IntensityPreference>(draft.intensityPreference ?? 'gentle');
  const [limitations, setLimitations] = useState<Limitation[]>(draft.limitations ?? []);
  const [note, setNote] = useState(draft.limitationsNote ?? '');

  const toggle = (l: Limitation) =>
    setLimitations((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));

  const onContinue = () => {
    updateDraft({ step: 4, sportLevel: level, intensityPreference: intensity, limitations, limitationsNote: note.trim() || undefined });
    router.push('/onboarding/goals');
  };

  return (
    <Screen footer={<AppButton label={t('common.continue')} onPress={onContinue} size="lg" icon="arrow-forward" />}>
      <OnboardingHeader step={3} title={t('onboarding.health.title')} subtitle={t('onboarding.health.subtitle')} />
      <ChipGroup
        label={t('onboarding.health.level')}
        options={[
          { value: 'beginner', label: t('level.beginner') },
          { value: 'intermediate', label: t('level.intermediate') },
          { value: 'advanced', label: t('level.advanced') },
        ]}
        value={level}
        onChange={setLevel}
      />
      <Banner text={t(`onboarding.health.levelHint.${level}`)} tone="success" icon="walk-outline" />
      <ChipGroup
        label={t('onboarding.health.intensity')}
        options={[
          { value: 'gentle', label: t('intensity.gentle') },
          { value: 'moderate', label: t('intensity.moderate') },
          { value: 'dynamic', label: t('intensity.dynamic') },
        ]}
        value={intensity}
        onChange={setIntensity}
      />
      <ChipGroup
        label={t('onboarding.health.limitations')}
        options={LIMITATION_OPTIONS.map((l) => ({ value: l, label: t(`limitations.${l}`) }))}
        value={limitations}
        onChange={toggle}
        multiple
        compact
      />
      <TextField label={t('onboarding.health.note')} value={note} onChangeText={setNote} maxLength={300} multiline hint={t('onboarding.health.noteHint')} />
      <Banner text={t('onboarding.health.safety')} tone="warm" icon="medkit-outline" />
    </Screen>
  );
}
