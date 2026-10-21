import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, Banner, ChipGroup, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useUserStore } from '@/store';
import { LIMITATION_OPTIONS } from '@/data/limitations';
import type { IntensityPreference, Limitation, SportLevel } from '@/types';
import { parseEurosToCents } from '@/utils/money';
import { computeFagerstromScore, fagerstromLevel } from '@/utils/fagerstrom';

export default function EditProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const updateUser = useUserStore((s) => s.updateUser);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [cigs, setCigs] = useState(String(user?.smoking.cigarettesPerDay ?? ''));
  const [years, setYears] = useState(String(user?.smoking.yearsSmoking ?? ''));
  const [price, setPrice] = useState(user ? (user.smoking.packPriceCents / 100).toFixed(2).replace('.', ',') : '');
  const [perPack, setPerPack] = useState(String(user?.smoking.cigarettesPerPack ?? 20));
  const [level, setLevel] = useState<SportLevel>(user?.sportLevel ?? 'beginner');
  const [intensity, setIntensity] = useState<IntensityPreference>(user?.intensityPreference ?? 'gentle');
  const [limitations, setLimitations] = useState<Limitation[]>(user?.limitations ?? []);
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

  const save = () => {
    const c = Number(cigs);
    const y = Number(years);
    const p = parseEurosToCents(price);
    const pp = Number(perPack);
    if (!(c >= 1 && c <= 100) || !(y >= 0 && y <= 80) || p === null || p <= 0 || !(pp >= 1 && pp <= 50)) {
      setError(t('onboarding.profile.errors.invalid'));
      return;
    }
    // Keep the Fagerström consistency: the Q4 answer depends on daily consumption.
    const answers = user.smoking.fagerstromAnswers ? [...user.smoking.fagerstromAnswers] : undefined;
    if (answers) {
      answers[3] = c <= 10 ? 0 : c <= 20 ? 1 : c <= 30 ? 2 : 3;
    }
    const score = answers ? computeFagerstromScore(answers) : user.smoking.dependenceScore;
    updateUser({
      firstName: firstName.trim(),
      smoking: { ...user.smoking, cigarettesPerDay: c, yearsSmoking: y, packPriceCents: p, cigarettesPerPack: pp, fagerstromAnswers: answers, dependenceScore: score, dependenceLevel: score !== undefined ? fagerstromLevel(score) : undefined },
      // Baseline drives savings: history stays consistent because savings are recomputed from events.
      smokingBaselinePerDay: c,
      sportLevel: level,
      intensityPreference: intensity,
      limitations,
    });
    router.back();
  };

  return (
    <Screen footer={<AppButton label={t('common.save')} icon="checkmark" onPress={save} />}>
      <ScreenHeader title={t('profile.editTitle')} />
      <TextField label={t('onboarding.profile.firstName')} value={firstName} onChangeText={setFirstName} maxLength={40} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <TextField label={t('onboarding.profile.cigarettesPerDay')} value={cigs} onChangeText={setCigs} keyboardType="number-pad" maxLength={3} />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label={t('onboarding.profile.yearsSmoking')} value={years} onChangeText={setYears} keyboardType="number-pad" maxLength={2} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <TextField label={t('onboarding.profile.packPrice')} value={price} onChangeText={setPrice} keyboardType="decimal-pad" maxLength={6} suffix="€" />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label={t('onboarding.profile.cigarettesPerPack')} value={perPack} onChangeText={setPerPack} keyboardType="number-pad" maxLength={2} />
        </View>
      </View>
      <Banner text={t('profile.baselineNote')} />
      <ChipGroup label={t('onboarding.health.level')} options={(['beginner', 'intermediate', 'advanced'] as SportLevel[]).map((l) => ({ value: l, label: t(`level.${l}`) }))} value={level} onChange={setLevel} />
      <ChipGroup label={t('onboarding.health.intensity')} options={(['gentle', 'moderate', 'dynamic'] as IntensityPreference[]).map((i) => ({ value: i, label: t(`intensity.${i}`) }))} value={intensity} onChange={setIntensity} />
      <ChipGroup label={t('onboarding.health.limitations')} options={LIMITATION_OPTIONS.map((l) => ({ value: l, label: t(`limitations.${l}`) }))} value={limitations} onChange={(l) => setLimitations((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]))} multiple compact />
      {error ? <Banner text={error} tone="danger" /> : null}
    </Screen>
  );
}
