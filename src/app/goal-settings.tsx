import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, AppCard, AppText, Banner, ChipGroup, ConfirmDialog, NumberStepper, Screen, ScreenHeader } from '@/components/ui';
import { useSettingsStore, useUserStore } from '@/store';
import type { QuitGoal } from '@/types';
import { quitDateForChoice, type QuitChoice } from '@/utils/quitDate';
import { formatDate } from '@/utils/money';

export default function GoalSettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const switchGoal = useUserStore((s) => s.switchGoal);
  const setQuitDate = useUserStore((s) => s.setQuitDate);
  const language = useSettingsStore((s) => s.settings.language);
  const [goal, setGoal] = useState<QuitGoal>(user?.goal ?? 'quit');
  const [choice, setChoice] = useState<QuitChoice | 'keep'>(() => (user?.goal === 'quit' && user.quitDate ? 'keep' : 'now'));
  const [pastDays, setPastDays] = useState(1);
  const [target, setTarget] = useState(user?.reductionTargetPerDay ?? Math.max(1, Math.round((user?.smokingBaselinePerDay ?? 10) * 0.75)));
  const [confirm, setConfirm] = useState(false);
  const keptDate = user?.goal === 'quit' ? user.quitDate : undefined;
  const newQuitDate = useMemo(() => (choice === 'keep' ? keptDate : quitDateForChoice(choice, pastDays)), [choice, pastDays, keptDate]);
  if (!user) return null;

  const apply = () => {
    if (goal === 'quit') {
      const date = newQuitDate ?? new Date().toISOString();
      if (user.goal === 'quit') {
        // Same attempt, corrected date: savings may start earlier, never later.
        if (choice !== 'keep') setQuitDate(date, { correction: true });
      } else {
        switchGoal('quit', { quitDate: date });
      }
    } else {
      switchGoal('reduce', { reductionTargetPerDay: target });
    }
    setConfirm(false);
    router.back();
  };

  return (
    <Screen footer={<AppButton label={t('common.save')} icon="checkmark" onPress={() => setConfirm(true)} />}>
      <ScreenHeader title={t('goalSettings.title')} subtitle={t('goalSettings.subtitle')} />
      <ChipGroup
        options={[
          { value: 'quit', label: t('goal.quit'), icon: 'flag-outline' },
          { value: 'reduce', label: t('goal.reduce'), icon: 'trending-down-outline' },
        ]}
        value={goal}
        onChange={setGoal}
      />
      {goal === 'quit' ? (
        <>
          <ChipGroup
            label={t('onboarding.goals.quitDate')}
            options={[
              ...(user.goal === 'quit' && user.quitDate ? [{ value: 'keep' as const, label: t('goalSettings.keepDate') }] : []),
              { value: 'now', label: t('onboarding.goals.choice.now') },
              { value: 'tomorrow', label: t('onboarding.goals.choice.tomorrow') },
              { value: 'in3', label: t('onboarding.goals.choice.in3') },
              { value: 'in7', label: t('onboarding.goals.choice.in7') },
              { value: 'past', label: t('onboarding.goals.choice.past') },
            ]}
            value={choice}
            onChange={setChoice}
            compact
          />
          {choice === 'past' ? <NumberStepper label={t('onboarding.goals.pastDays')} value={pastDays} onChange={setPastDays} min={1} max={3650} unit={t('units.days')} /> : null}
          <AppCard tone="primary">
            <AppText variant="bodySmall" tone="secondary">
              {t('onboarding.goals.quitDateIs')}
            </AppText>
            <AppText variant="h2">{newQuitDate ? formatDate(newQuitDate, language, true) : '–'}</AppText>
          </AppCard>
          <Banner text={t('goalSettings.quitNote')} />
        </>
      ) : (
        <>
          <NumberStepper label={t('onboarding.goals.target')} value={target} onChange={setTarget} min={0} max={Math.max(0, user.smokingBaselinePerDay - 1)} unit={t('units.cigsPerDay')} />
          <Banner text={t('goalSettings.reduceNote', { baseline: user.smokingBaselinePerDay })} />
        </>
      )}
      <Banner text={t('goalSettings.historyKept')} tone="success" icon="shield-checkmark-outline" />
      <ConfirmDialog visible={confirm} title={t('goalSettings.confirmTitle')} message={t('goalSettings.confirmMessage')} confirmLabel={t('common.confirm')} cancelLabel={t('common.cancel')} onConfirm={apply} onCancel={() => setConfirm(false)} />
    </Screen>
  );
}
