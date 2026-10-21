import React, { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppButton, AppCard, AppText, Banner, ChipGroup, ConfirmDialog, NumberStepper, Screen, ScreenHeader, SwitchRow, TextField } from '@/components/ui';
import { useCravingStore, useRewardStore, useUserStore } from '@/store';
import { useSosSession } from '@/store/useSosSession';
import { TRIGGERS, type SmokingEvent, type Trigger } from '@/types';
import { canUseShield, computeCurrentStreak } from '@/utils/streaks';
import { dayKey, nowIso } from '@/utils/dates';
import { xpEventId } from '@/services/rewardService';
import { useStreak } from '@/hooks/useRewards';
import { getThematicWorkout } from '@/data/workouts';

type Decision = NonNullable<SmokingEvent['decision']>;
const WHEN_OPTIONS = [0, 1, 2, 4, 8] as const;

export default function RelapseScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const user = useUserStore((s) => s.user);
  const switchGoal = useUserStore((s) => s.switchGoal);
  const addSmokingEvent = useCravingStore((s) => s.addSmokingEvent);
  const smokingEvents = useCravingStore((s) => s.smokingEvents);
  const rewards = useRewardStore();
  const streak = useStreak();
  const sos = useSosSession();
  // Mode frozen when the screen opens: switching to reduction here must not change this screen.
  const [isReduction] = useState(() => mode === 'reduction' || useUserStore.getState().user?.goal === 'reduce');
  const savingRef = useRef(false);

  const [cigarettes, setCigarettes] = useState(1);
  const [hoursAgo, setHoursAgo] = useState<number>(0);
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [context, setContext] = useState('');
  const [decision, setDecision] = useState<Decision>(isReduction ? 'reduction_log' : 'continue_quit');
  const [useShieldNow, setUseShieldNow] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [saved, setSaved] = useState<SmokingEvent | null>(null);

  // Reference instant captured when the screen opens; the event time is computed from it.
  const [openedAt] = useState(() => Date.now());
  const occurredAt = useMemo(() => new Date(openedAt - hoursAgo * 3600_000).toISOString(), [openedAt, hoursAgo]);
  const shieldCheck = useMemo(() => canUseShield(rewards, dayKey(occurredAt)), [rewards, occurredAt]);
  const streakAtRisk = !isReduction && streak.currentDays > 0;

  if (!user) return null;

  const save = () => {
    if (savingRef.current) return; // ignore a double tap on Confirm
    savingRef.current = true;
    const event = addSmokingEvent({
      occurredAt,
      cigarettes,
      trigger: trigger ?? undefined,
      context: context.trim() || undefined,
      decision,
      shieldUsed: useShieldNow && shieldCheck.ok,
    });
    if (useShieldNow && shieldCheck.ok) rewards.useShield(dayKey(occurredAt));
    if (decision === 'switch_to_reduce') switchGoal('reduce');
    if (decision === 'new_quit_date') {
      // The new quit moment is "now": the counter restarts from this instant.
      useUserStore.getState().setQuitDate(nowIso());
    }
    setConfirm(false);
    setSaved(event);
  };

  const goNext = (action: 'breathing' | 'reset' | 'calm' | 'pact' | 'plan') => {
    if (saved && !isReduction) rewards.awardXp(xpEventId.relapseRecovery(saved.id), 'relapse_recovery');
    switch (action) {
      case 'breathing':
        sos.begin({ intervention: 'breathing' });
        router.replace('/sos/breathing');
        return;
      case 'reset': {
        const w = getThematicWorkout('reset');
        router.replace(w ? { pathname: '/workout/[id]', params: { id: w.id } } : '/(tabs)/sport');
        return;
      }
      case 'calm': {
        const w = getThematicWorkout('calm');
        router.replace(w ? { pathname: '/workout/[id]', params: { id: w.id } } : '/(tabs)/sport');
        return;
      }
      case 'pact':
        router.replace('/pact');
        return;
      case 'plan':
        router.replace('/goal-settings');
        return;
    }
  };

  if (saved) {
    const newStreak = computeCurrentStreak(user, smokingEvents, rewards);
    return (
      <Screen footer={<AppButton label={t('common.backHome')} variant="ghost" onPress={() => router.replace('/(tabs)')} />}>
        <View style={{ alignItems: 'center', gap: 10, paddingTop: 16 }}>
          <Ionicons name="heart" size={56} color={theme.colors.accent} />
          <AppText variant="h1" align="center">
            {isReduction ? t('relapse.loggedTitleReduction') : t('relapse.loggedTitle')}
          </AppText>
          <AppText tone="secondary" align="center">
            {isReduction ? t('relapse.loggedTextReduction') : t('relapse.loggedText')}
          </AppText>
        </View>
        {!isReduction ? (
          <AppCard tone="accent">
            <AppText variant="bodySmall" tone="accent">
              {t('relapse.kept', { xp: rewards.xp, badges: rewards.badges.length, best: Math.max(rewards.bestStreakDays, streak.bestDays) })}
            </AppText>
            <AppText variant="bodySmall" tone="accent" style={{ marginTop: 4 }}>
              {saved.shieldUsed ? t('relapse.shieldApplied', { count: newStreak }) : t('relapse.streakNow', { count: newStreak })}
            </AppText>
          </AppCard>
        ) : null}
        {user.why ? (
          <AppCard tone="alt" title={t('relapse.yourWhy')}>
            <AppText style={{ fontStyle: 'italic' }}>{user.why}</AppText>
            <AppText variant="caption" tone="secondary" style={{ marginTop: 8 }}>
              {t('pact.text')}
            </AppText>
          </AppCard>
        ) : null}
        <AppText variant="h3">{t('relapse.nextStep')}</AppText>
        <AppButton label={t('relapse.actions.breathing')} icon="cloud-outline" variant="primary" onPress={() => goNext('breathing')} />
        <AppButton label={t('relapse.actions.reset')} icon="refresh-outline" variant="accent" onPress={() => goNext('reset')} />
        <AppButton label={t('relapse.actions.stretch')} icon="leaf-outline" variant="secondary" onPress={() => goNext('calm')} />
        <AppButton label={t('relapse.actions.pact')} icon="document-text-outline" variant="secondary" onPress={() => goNext('pact')} />
        {!isReduction ? <AppButton label={t('relapse.actions.plan')} icon="map-outline" variant="ghost" onPress={() => goNext('plan')} /> : null}
      </Screen>
    );
  }

  return (
    <Screen footer={<AppButton label={t('common.save')} icon="checkmark" onPress={() => setConfirm(true)} />}>
      <ScreenHeader title={isReduction ? t('relapse.titleReduction') : t('relapse.title')} />
      {!isReduction ? <Banner text={t('relapse.kindMessage')} tone="success" icon="heart-outline" /> : <Banner text={t('relapse.reductionHint')} />}
      <NumberStepper label={t('relapse.count')} value={cigarettes} onChange={setCigarettes} min={1} max={100} unit={t('units.cigs')} />
      <ChipGroup label={t('relapse.when')} options={WHEN_OPTIONS.map((h) => ({ value: h, label: h === 0 ? t('relapse.whenNow') : t('relapse.whenHoursAgo', { count: h }) }))} value={hoursAgo} onChange={setHoursAgo} compact />
      <ChipGroup label={t('craving.trigger')} options={TRIGGERS.map((tr) => ({ value: tr, label: t(`triggers.${tr}`) }))} value={trigger} onChange={setTrigger} compact />
      <TextField label={t('relapse.situation')} value={context} onChangeText={setContext} maxLength={300} multiline />
      {!isReduction ? (
        <>
          <ChipGroup
            label={t('relapse.decision')}
            options={[
              { value: 'continue_quit', label: t('relapse.decisions.continue_quit') },
              { value: 'new_quit_date', label: t('relapse.decisions.new_quit_date') },
              { value: 'switch_to_reduce', label: t('relapse.decisions.switch_to_reduce') },
            ]}
            value={decision}
            onChange={(d) => setDecision(d)}
          />
          <AppText variant="caption" tone="secondary">
            {t(`relapse.decisionHints.${decision}`)}
          </AppText>
          {streakAtRisk ? (
            <AppCard tone={shieldCheck.ok ? 'warm' : 'alt'}>
              <SwitchRow label={t('relapse.shield.title')} description={shieldCheck.ok ? t('relapse.shield.ok', { count: streak.currentDays }) : t(`relapse.shield.${shieldCheck.reason ?? 'cooldown'}`)} value={useShieldNow} onChange={setUseShieldNow} disabled={!shieldCheck.ok} />
            </AppCard>
          ) : null}
        </>
      ) : null}
      <ConfirmDialog
        visible={confirm}
        title={t('relapse.confirmTitle')}
        message={useShieldNow && shieldCheck.ok ? t('relapse.confirmWithShield') : t('relapse.confirmMessage', { count: cigarettes })}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={save}
        onCancel={() => setConfirm(false)}
      />
    </Screen>
  );
}
