import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { AppButton, AppText, Banner, ChipGroup, Screen, TextField } from '@/components/ui';
import { useUserStore } from '@/store';
import { profileFormSchema, zodResolver, type ProfileFormValues } from '@/utils/validation';
import { parseEurosToCents } from '@/utils/money';
import type { QuitGoal, Substance } from '@/types';
import { dependenceTestRoute } from '@/utils/onboardingFlow';

const decimal = (n: number | undefined, digits: number) => (n === undefined ? '' : n.toFixed(digits).replace('.', ','));

export default function ProfileStep() {
  const router = useRouter();
  const { t } = useTranslation();
  const draft = useUserStore((s) => s.draft);
  const updateDraft = useUserStore((s) => s.updateDraft);
  const [goal, setGoal] = React.useState<QuitGoal>(draft.goal ?? 'quit');

  const cannabis = draft.smoking?.cannabis;
  const [mixed, setMixed] = React.useState<'yes' | 'no'>(cannabis?.mixedWithTobacco ? 'yes' : 'no');
  const { control, handleSubmit, formState, setValue } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: draft.firstName ?? '',
      age: draft.age ? String(draft.age) : '',
      substance: draft.smoking?.substance ?? 'tobacco',
      cigarettesPerDay: draft.smoking?.cigarettesPerDay ? String(draft.smoking.cigarettesPerDay) : '',
      yearsSmoking: draft.smoking && draft.smoking.substance !== 'cannabis' ? String(draft.smoking.yearsSmoking) : '',
      packPrice: draft.smoking?.packPriceCents ? decimal(draft.smoking.packPriceCents / 100, 2) : '',
      cigarettesPerPack: draft.smoking ? String(draft.smoking.cigarettesPerPack) : '20',
      jointsPerDay: cannabis ? String(cannabis.jointsPerDay) : '',
      yearsUsing: cannabis ? String(cannabis.yearsUsing) : '',
      gramsPerJoint: cannabis ? decimal(cannabis.gramsPerJoint, 2) : '',
      pricePerGram: cannabis ? decimal(cannabis.pricePerGramCents / 100, 2) : '',
    },
    mode: 'onBlur',
  });

  const substance: Substance = useWatch({ control, name: 'substance' });
  const usesTobacco = substance !== 'cannabis';
  const usesCannabis = substance !== 'tobacco';

  const onSubmit = (values: ProfileFormValues) => {
    const tobacco = values.substance !== 'cannabis';
    const weed = values.substance !== 'tobacco';
    const previousTests = draft.smoking?.substance === values.substance ? draft.smoking : undefined;
    updateDraft({
      step: 2,
      firstName: values.firstName.trim(),
      age: values.age ? Number(values.age) : undefined,
      goal,
      smoking: {
        // Test answers are kept only when the substance did not change.
        dependenceScore: tobacco ? previousTests?.dependenceScore : undefined,
        dependenceLevel: tobacco ? previousTests?.dependenceLevel : undefined,
        fagerstromAnswers: tobacco ? previousTests?.fagerstromAnswers : undefined,
        substance: values.substance,
        cigarettesPerDay: tobacco ? Number(values.cigarettesPerDay) : 0,
        yearsSmoking: tobacco ? Number(values.yearsSmoking) : Number(values.yearsUsing),
        cigarettesPerPack: tobacco ? Number(values.cigarettesPerPack) : 20,
        packPriceCents: tobacco ? (parseEurosToCents(values.packPrice) ?? 0) : 0,
        cannabis: weed
          ? {
              jointsPerDay: Number(values.jointsPerDay),
              yearsUsing: Number(values.yearsUsing),
              gramsPerJoint: Number(values.gramsPerJoint.replace(',', '.')),
              pricePerGramCents: parseEurosToCents(values.pricePerGram) ?? 0,
              mixedWithTobacco: mixed === 'yes',
              cuditAnswers: previousTests?.cannabis?.cuditAnswers,
              cuditScore: previousTests?.cannabis?.cuditScore,
              cuditLevel: previousTests?.cannabis?.cuditLevel,
            }
          : undefined,
      },
    });
    router.push(dependenceTestRoute(values.substance));
  };

  const err = (key: keyof ProfileFormValues) => {
    const e = formState.errors[key];
    return e ? t(`onboarding.profile.errors.${String(e.message ?? 'invalid')}`) : undefined;
  };

  return (
    <Screen footer={<AppButton label={t('common.continue')} onPress={handleSubmit(onSubmit)} size="lg" icon="arrow-forward" />}>
      <OnboardingHeader step={1} title={t('onboarding.profile.title')} subtitle={t('onboarding.profile.subtitle')} />
      <Controller
        control={control}
        name="firstName"
        render={({ field }) => (
          <TextField label={t('onboarding.profile.firstName')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} autoCapitalize="words" maxLength={40} hint={t('onboarding.profile.firstNameHint')} error={err('firstName')} />
        )}
      />
      <Controller
        control={control}
        name="age"
        render={({ field }) => (
          <TextField label={t('onboarding.profile.age')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="number-pad" maxLength={3} hint={t('onboarding.profile.ageHint')} error={err('age')} />
        )}
      />
      <AppText variant="h3">{t('onboarding.profile.habitsTitle')}</AppText>
      <ChipGroup
        label={t('onboarding.profile.substance')}
        options={[
          { value: 'tobacco', label: t('substance.tobacco'), icon: 'flame-outline' },
          { value: 'cannabis', label: t('substance.cannabis'), icon: 'leaf-outline' },
          { value: 'both', label: t('substance.both'), icon: 'layers-outline' },
        ]}
        value={substance}
        onChange={(v) => setValue('substance', v, { shouldValidate: false })}
      />
      {usesTobacco ? (
        <>
          {substance === 'both' ? <AppText weight="semibold">{t('substance.tobacco')}</AppText> : null}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="cigarettesPerDay"
                render={({ field }) => (
                  <TextField label={t('onboarding.profile.cigarettesPerDay')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="number-pad" maxLength={3} error={err('cigarettesPerDay')} />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="yearsSmoking"
                render={({ field }) => (
                  <TextField label={t('onboarding.profile.yearsSmoking')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="number-pad" maxLength={2} error={err('yearsSmoking')} />
                )}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="packPrice"
                render={({ field }) => (
                  <TextField label={t('onboarding.profile.packPrice')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="decimal-pad" maxLength={6} suffix="€" error={err('packPrice')} />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="cigarettesPerPack"
                render={({ field }) => (
                  <TextField label={t('onboarding.profile.cigarettesPerPack')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="number-pad" maxLength={2} error={err('cigarettesPerPack')} />
                )}
              />
            </View>
          </View>
        </>
      ) : null}
      {usesCannabis ? (
        <>
          {substance === 'both' ? <AppText weight="semibold">{t('substance.cannabis')}</AppText> : null}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="jointsPerDay"
                render={({ field }) => (
                  <TextField label={t('onboarding.profile.jointsPerDay')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="number-pad" maxLength={2} error={err('jointsPerDay')} />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="yearsUsing"
                render={({ field }) => (
                  <TextField label={t('onboarding.profile.yearsUsing')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="number-pad" maxLength={2} error={err('yearsUsing')} />
                )}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="gramsPerJoint"
                render={({ field }) => (
                  <TextField label={t('onboarding.profile.gramsPerJoint')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="decimal-pad" maxLength={4} suffix="g" error={err('gramsPerJoint')} />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="pricePerGram"
                render={({ field }) => (
                  <TextField label={t('onboarding.profile.pricePerGram')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="decimal-pad" maxLength={6} suffix="€" error={err('pricePerGram')} />
                )}
              />
            </View>
          </View>
          <AppText variant="bodySmall" tone="secondary">
            {t('onboarding.profile.cannabisHint')}
          </AppText>
          {usesCannabis ? (
            <ChipGroup
              label={t('onboarding.profile.mixed')}
              options={[
                { value: 'yes', label: t('common.yes') },
                { value: 'no', label: t('common.no') },
              ]}
              value={mixed}
              onChange={(v) => setMixed(v)}
              compact
            />
          ) : null}
          {mixed === 'yes' ? (
            <Banner text={substance === 'cannabis' ? t('onboarding.profile.mixedNoteCannabis') : t('onboarding.profile.mixedNoteBoth')} icon="information-circle-outline" />
          ) : null}
        </>
      ) : null}
      <ChipGroup
        label={t('onboarding.profile.goal')}
        options={[
          { value: 'quit', label: t('goal.quit'), icon: 'flag-outline' },
          { value: 'reduce', label: t('goal.reduce'), icon: 'trending-down-outline' },
        ]}
        value={goal}
        onChange={(v) => setGoal(v)}
      />
      <AppText variant="bodySmall" tone="secondary">
        {goal === 'quit' ? t('onboarding.profile.goalQuitHint') : t('onboarding.profile.goalReduceHint')}
      </AppText>
    </Screen>
  );
}
