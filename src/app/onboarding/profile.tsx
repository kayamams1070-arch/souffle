import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { AppButton, AppText, ChipGroup, Screen, TextField } from '@/components/ui';
import { useUserStore } from '@/store';
import { profileFormSchema, zodResolver, type ProfileFormValues } from '@/utils/validation';
import { parseEurosToCents } from '@/utils/money';
import type { QuitGoal } from '@/types';

export default function ProfileStep() {
  const router = useRouter();
  const { t } = useTranslation();
  const draft = useUserStore((s) => s.draft);
  const updateDraft = useUserStore((s) => s.updateDraft);
  const [goal, setGoal] = React.useState<QuitGoal>(draft.goal ?? 'quit');

  const { control, handleSubmit, formState } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: draft.firstName ?? '',
      age: draft.age ? String(draft.age) : '',
      cigarettesPerDay: draft.smoking ? String(draft.smoking.cigarettesPerDay) : '',
      yearsSmoking: draft.smoking ? String(draft.smoking.yearsSmoking) : '',
      packPrice: draft.smoking ? (draft.smoking.packPriceCents / 100).toFixed(2).replace('.', ',') : '',
      cigarettesPerPack: draft.smoking ? String(draft.smoking.cigarettesPerPack) : '20',
    },
    mode: 'onBlur',
  });

  const onSubmit = (values: ProfileFormValues) => {
    const packPriceCents = parseEurosToCents(values.packPrice) ?? 0;
    updateDraft({
      step: 2,
      firstName: values.firstName.trim(),
      age: values.age ? Number(values.age) : undefined,
      goal,
      smoking: {
        ...draft.smoking,
        cigarettesPerDay: Number(values.cigarettesPerDay),
        yearsSmoking: Number(values.yearsSmoking),
        cigarettesPerPack: Number(values.cigarettesPerPack),
        packPriceCents,
      },
    });
    router.push('/onboarding/fagerstrom');
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
