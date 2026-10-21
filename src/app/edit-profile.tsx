import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, Banner, ChipGroup, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useUserStore } from '@/store';
import { LIMITATION_OPTIONS } from '@/data/limitations';
import type { IntensityPreference, Limitation, SportLevel, Substance } from '@/types';
import { parseEurosToCents } from '@/utils/money';
import { computeFagerstromScore, fagerstromLevel } from '@/utils/fagerstrom';

export default function EditProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const updateUser = useUserStore((s) => s.updateUser);
  const updateHabits = useUserStore((s) => s.updateHabits);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [cigs, setCigs] = useState(String(user?.smoking.cigarettesPerDay ?? ''));
  const [years, setYears] = useState(String(user?.smoking.yearsSmoking ?? ''));
  const [price, setPrice] = useState(user ? (user.smoking.packPriceCents / 100).toFixed(2).replace('.', ',') : '');
  const [perPack, setPerPack] = useState(String(user?.smoking.cigarettesPerPack ?? 20));
  const [substance, setSubstance] = useState<Substance>(user?.smoking.substance ?? 'tobacco');
  const weed = user?.smoking.cannabis;
  const [joints, setJoints] = useState(weed ? String(weed.jointsPerDay) : '');
  const [yearsUsing, setYearsUsing] = useState(weed ? String(weed.yearsUsing) : '');
  const [grams, setGrams] = useState(weed ? weed.gramsPerJoint.toFixed(2).replace('.', ',') : '');
  const [gramPrice, setGramPrice] = useState(weed ? (weed.pricePerGramCents / 100).toFixed(2).replace('.', ',') : '');
  const [level, setLevel] = useState<SportLevel>(user?.sportLevel ?? 'beginner');
  const [intensity, setIntensity] = useState<IntensityPreference>(user?.intensityPreference ?? 'gentle');
  const [limitations, setLimitations] = useState<Limitation[]>(user?.limitations ?? []);
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

  const usesTobacco = substance !== 'cannabis';
  const usesCannabis = substance !== 'tobacco';

  const save = () => {
    const c = usesTobacco ? Number(cigs) : 0;
    const y = usesTobacco ? Number(years) : Number(yearsUsing);
    const p = usesTobacco ? parseEurosToCents(price) : user.smoking.packPriceCents;
    const pp = Number(perPack);
    const j = Number(joints);
    const yu = Number(yearsUsing);
    const g = Number(grams.replace(',', '.'));
    const gp = parseEurosToCents(gramPrice);
    const tobaccoOk = !usesTobacco || (c >= 1 && c <= 100 && y >= 0 && y <= 80 && p !== null && p > 0 && pp >= 1 && pp <= 50);
    const cannabisOk =
      !usesCannabis || (Number.isInteger(j) && j >= 1 && j <= 50 && Number.isInteger(yu) && yu >= 0 && yu <= 80 && g >= 0.05 && g <= 5 && gp !== null && gp > 0);
    if (!tobaccoOk || !cannabisOk || p === null || (usesCannabis && gp === null)) {
      setError(t('onboarding.profile.errors.invalid'));
      return;
    }
    // Keep the Fagerström consistency: the Q4 answer depends on daily consumption.
    const saved = user.smoking.fagerstromAnswers;
    const answers =
      saved && usesTobacco ? saved.map((a, i) => (i === 3 ? (c <= 10 ? 0 : c <= 20 ? 1 : c <= 30 ? 2 : 3) : a)) : saved;
    const score = answers ? computeFagerstromScore(answers) : user.smoking.dependenceScore;
    const cannabis = usesCannabis
      ? {
          ...weed,
          jointsPerDay: j,
          yearsUsing: yu,
          gramsPerJoint: g,
          pricePerGramCents: gp ?? 0,
          mixedWithTobacco: weed?.mixedWithTobacco ?? false,
        }
      : weed;
    // Substance first, so the versioned habits below know about cannabis.
    updateUser({ smoking: { ...user.smoking, substance, cannabis } });
    // Habits are versioned: past savings keep the values that applied at the time.
    updateHabits({
      cigarettesPerDay: c,
      cigarettesPerPack: pp,
      packPriceCents: p,
      ...(usesCannabis ? { jointsPerDay: j, gramsPerJoint: g, pricePerGramCents: gp ?? 0 } : { jointsPerDay: 0 }),
    });
    const fresh = useUserStore.getState().user ?? user;
    updateUser({
      firstName: firstName.trim(),
      smoking: {
        ...fresh.smoking,
        yearsSmoking: y,
        fagerstromAnswers: answers,
        dependenceScore: score,
        dependenceLevel: score !== undefined ? fagerstromLevel(score) : undefined,
      },
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
      <ChipGroup
        label={t('onboarding.profile.substance')}
        options={[
          { value: 'tobacco', label: t('substance.tobacco'), icon: 'flame-outline' },
          { value: 'cannabis', label: t('substance.cannabis'), icon: 'leaf-outline' },
          { value: 'both', label: t('substance.both'), icon: 'layers-outline' },
        ]}
        value={substance}
        onChange={setSubstance}
      />
      {usesTobacco ? (
        <>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <TextField label={t('onboarding.profile.cigarettesPerDay')} value={cigs === '0' ? '' : cigs} onChangeText={setCigs} keyboardType="number-pad" maxLength={3} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label={t('onboarding.profile.yearsSmoking')} value={years} onChangeText={setYears} keyboardType="number-pad" maxLength={2} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <TextField label={t('onboarding.profile.packPrice')} value={price === '0,00' ? '' : price} onChangeText={setPrice} keyboardType="decimal-pad" maxLength={6} suffix="€" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label={t('onboarding.profile.cigarettesPerPack')} value={perPack} onChangeText={setPerPack} keyboardType="number-pad" maxLength={2} />
            </View>
          </View>
        </>
      ) : null}
      {usesCannabis ? (
        <>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <TextField label={t('onboarding.profile.jointsPerDay')} value={joints} onChangeText={setJoints} keyboardType="number-pad" maxLength={2} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label={t('onboarding.profile.yearsUsing')} value={yearsUsing} onChangeText={setYearsUsing} keyboardType="number-pad" maxLength={2} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <TextField label={t('onboarding.profile.gramsPerJoint')} value={grams} onChangeText={setGrams} keyboardType="decimal-pad" maxLength={4} suffix="g" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label={t('onboarding.profile.pricePerGram')} value={gramPrice} onChangeText={setGramPrice} keyboardType="decimal-pad" maxLength={6} suffix="€" />
            </View>
          </View>
        </>
      ) : null}
      <Banner text={t('profile.baselineNote')} />
      <ChipGroup label={t('onboarding.health.level')} options={(['beginner', 'intermediate', 'advanced'] as SportLevel[]).map((l) => ({ value: l, label: t(`level.${l}`) }))} value={level} onChange={setLevel} />
      <ChipGroup label={t('onboarding.health.intensity')} options={(['gentle', 'moderate', 'dynamic'] as IntensityPreference[]).map((i) => ({ value: i, label: t(`intensity.${i}`) }))} value={intensity} onChange={setIntensity} />
      <ChipGroup label={t('onboarding.health.limitations')} options={LIMITATION_OPTIONS.map((l) => ({ value: l, label: t(`limitations.${l}`) }))} value={limitations} onChange={(l) => setLimitations((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]))} multiple compact />
      {error ? <Banner text={error} tone="danger" /> : null}
    </Screen>
  );
}
