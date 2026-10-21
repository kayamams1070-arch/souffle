import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppButton, AppCard, AppText, ChipGroup, ScaleSelector, Screen } from '@/components/ui';
import { useCravingStore, useRewardStore } from '@/store';
import { useSosSession } from '@/store/useSosSession';
import { TRIGGERS, type CravingOutcome, type Trigger } from '@/types';
import { xpEventId } from '@/services/rewardService';
import { useHaptics } from '@/hooks/useHaptics';
import { formatMinutesAsClock } from '@/utils/dates';

export default function SosFeedbackScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const haptics = useHaptics();
  const session = useSosSession();
  const addCraving = useCravingStore((s) => s.addCraving);
  const updateCraving = useCravingStore((s) => s.updateCraving);
  const awardXp = useRewardStore((s) => s.awardXp);
  const [outcome, setOutcome] = useState<CravingOutcome | null>(null);
  const [intensity, setIntensity] = useState<number | null>(session.intensity);
  const [trigger, setTrigger] = useState<Trigger | null>(session.trigger);
  const [saved, setSaved] = useState<{ xp: number } | null>(null);

  const save = () => {
    if (!outcome) return;
    const intervention = session.intervention ?? 'none';
    const base = {
      intensity: intensity ?? 5,
      trigger: trigger ?? 'other',
      interventionType: intervention,
      interventionCompleted: session.completed,
      outcome,
      durationSeconds: session.durationSeconds,
    } as const;
    let cravingId = session.cravingId;
    if (cravingId) {
      updateCraving(cravingId, base);
    } else {
      cravingId = addCraving({ ...base, occurredAt: session.startedAt ?? new Date().toISOString() }).id;
    }
    let xp = 0;
    if (outcome === 'passed' || outcome === 'partly_passed') xp += awardXp(xpEventId.craving(cravingId), 'craving_overcome');
    if (session.completed) xp += awardXp(xpEventId.sos(cravingId), 'sos_completed');
    if (xp > 0) haptics.success();
    setSaved({ xp });
    session.clear();
  };

  if (saved) {
    return (
      <Screen footer={<AppButton label={t('common.backHome')} icon="home-outline" onPress={() => router.replace('/(tabs)')} />}>
        <View style={{ alignItems: 'center', gap: 12, paddingTop: 40 }}>
          <Ionicons name="heart-circle" size={72} color={theme.colors.accent} />
          <AppText variant="h1" align="center">
            {t(`sos.feedback.thanks.${outcome ?? 'passed'}`)}
          </AppText>
          <AppText tone="secondary" align="center">
            {t(`sos.feedback.message.${outcome ?? 'passed'}`)}
          </AppText>
          {saved.xp > 0 ? (
            <AppText weight="bold" tone="warm">
              +{saved.xp} XP
            </AppText>
          ) : null}
        </View>
        {outcome === 'persisted' ? (
          <View style={{ gap: 10 }}>
            <AppButton label={t('sos.feedback.tryAnother')} variant="secondary" icon="hand-left-outline" onPress={() => router.replace('/(tabs)/sos')} />
            <AppButton label={t('sos.feedback.surf')} variant="ghost" icon="water-outline" onPress={() => { session.begin({ intervention: 'craving_surf' }); router.replace('/craving/surf'); }} />
          </View>
        ) : null}
        <AppButton label={t('sos.feedback.journal')} variant="ghost" icon="create-outline" onPress={() => router.replace({ pathname: '/journal', params: { prefill: 'craving_overcome' } })} />
      </Screen>
    );
  }

  return (
    <Screen footer={<AppButton label={t('common.save')} icon="checkmark" onPress={save} disabled={!outcome} />}>
      <AppText variant="h1">{t('sos.feedback.title')}</AppText>
      {session.durationSeconds > 0 ? (
        <AppText tone="secondary">{t('sos.feedback.duration', { time: formatMinutesAsClock(session.durationSeconds), intervention: t(`interventions.${session.intervention ?? 'none'}`) })}</AppText>
      ) : null}
      <View style={{ gap: 10 }}>
        {(
          [
            ['passed', 'checkmark-circle-outline'],
            ['partly_passed', 'trending-down-outline'],
            ['persisted', 'cloud-outline'],
          ] as const
        ).map(([value, icon]) => (
          <AppCard key={value} tone={outcome === value ? 'primary' : 'default'} onPress={() => setOutcome(value)} accessibilityLabel={t(`outcomes.${value}`)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name={icon} size={26} color={theme.colors.primary} />
              <AppText variant="h3" style={{ flex: 1 }}>
                {t(`outcomes.${value}`)}
              </AppText>
              {outcome === value ? <Ionicons name="checkmark" size={22} color={theme.colors.primary} /> : null}
            </View>
          </AppCard>
        ))}
      </View>
      {session.intensity === null ? (
        <ScaleSelector label={t('sos.feedback.intensityBefore')} value={intensity} onChange={setIntensity} min={1} max={10} minLabel={t('craving.intensityLow')} maxLabel={t('craving.intensityHigh')} />
      ) : null}
      {session.trigger === null ? (
        <ChipGroup label={t('sos.feedback.triggerOptional')} options={TRIGGERS.map((tr) => ({ value: tr, label: t(`triggers.${tr}`) }))} value={trigger} onChange={setTrigger} compact />
      ) : null}
    </Screen>
  );
}
