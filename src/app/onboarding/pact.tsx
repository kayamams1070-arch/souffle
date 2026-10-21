import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { AppButton, AppCard, AppText, Banner, ChipGroup, Screen, TextField } from '@/components/ui';
import { useUserStore } from '@/store';
import type { QuitReason, User } from '@/types';
import { createId } from '@/utils/ids';
import { nowIso } from '@/utils/dates';
import { userSchema } from '@/utils/validation';
import { habitsFromProfile, unitsPerDay } from '@/utils/calculations';
import { useHaptics } from '@/hooks/useHaptics';

const REASONS: QuitReason[] = ['family', 'health', 'breath', 'money', 'freedom', 'children', 'other'];

export default function PactStep() {
  const router = useRouter();
  const { t } = useTranslation();
  const haptics = useHaptics();
  const draft = useUserStore((s) => s.draft);
  const setUser = useUserStore((s) => s.setUser);
  const clearDraft = useUserStore((s) => s.clearDraft);
  const [reasons, setReasons] = useState<QuitReason[]>(draft.reasons ?? []);
  const [why, setWhy] = useState(draft.why ?? '');
  const [signature, setSignature] = useState(draft.firstName ?? '');
  const [error, setError] = useState<string | null>(null);

  const toggle = (r: QuitReason) => setReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  const canSign = signature.trim().length > 0 && (why.trim().length > 0 || reasons.length > 0);

  const onSign = () => {
    const now = nowIso();
    const smoking = draft.smoking;
    if (!smoking) {
      setError(t('onboarding.pact.missing'));
      return;
    }
    const user: User = {
      id: createId('usr'),
      firstName: draft.firstName ?? '',
      age: draft.age,
      createdAt: now,
      updatedAt: now,
      smoking,
      goal: draft.goal ?? 'quit',
      quitDate: draft.goal === 'reduce' ? undefined : (draft.quitDate ?? now),
      reductionTargetPerDay: draft.goal === 'reduce' ? draft.reductionTargetPerDay : undefined,
      reductionStartDate: draft.goal === 'reduce' ? now : undefined,
      smokingBaselinePerDay: Math.max(1, unitsPerDay(habitsFromProfile(smoking))),
      savingsStartDate: draft.goal === 'reduce' ? now : (draft.quitDate ?? now),
      sportLevel: draft.sportLevel ?? 'beginner',
      intensityPreference: draft.intensityPreference ?? 'gentle',
      limitations: draft.limitations ?? [],
      limitationsNote: draft.limitationsNote,
      why: why.trim(),
      reasons,
      personalPactSignedAt: now,
      pactSignature: signature.trim(),
      onboardingCompleted: true,
    };
    const parsed = userSchema.safeParse(user);
    if (!parsed.success) {
      setError(t('onboarding.pact.invalid'));
      return;
    }
    setUser(parsed.data as User);
    clearDraft();
    haptics.success();
    router.replace('/(tabs)');
  };

  return (
    <Screen footer={<AppButton label={t('onboarding.pact.sign')} onPress={onSign} size="lg" icon="create-outline" disabled={!canSign} />}>
      <OnboardingHeader step={5} title={t('onboarding.pact.title')} subtitle={t('onboarding.pact.subtitle')} />
      <ChipGroup label={t('onboarding.pact.reasons')} options={REASONS.map((r) => ({ value: r, label: t(`reasons.${r}`) }))} value={reasons} onChange={toggle} multiple compact />
      <TextField label={t('onboarding.pact.why')} value={why} onChangeText={setWhy} multiline maxLength={500} hint={t('onboarding.pact.whyHint')} />
      <AppCard tone="accent" title={t('onboarding.pact.contractTitle')}>
        <View style={{ gap: 12 }}>
          <AppText style={{ fontStyle: 'italic' }}>{t('pact.text')}</AppText>
          <TextField label={t('onboarding.pact.signature')} value={signature} onChangeText={setSignature} maxLength={60} autoCapitalize="words" hint={t('onboarding.pact.signatureHint')} />
        </View>
      </AppCard>
      {error ? <Banner text={error} tone="danger" /> : null}
      <Banner text={t('onboarding.pact.editLater')} />
    </Screen>
  );
}
