import React, { useMemo, useState } from 'react';
import { useSubstance } from '@/hooks/useSubstance';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText, Banner, ChipGroup, ScaleSelector, Screen, TextField } from '@/components/ui';
import { useCravingStore, useRewardStore, useUserStore } from '@/store';
import { useSosSession } from '@/store/useSosSession';
import { triggersFor, type CravingOutcome, type InterventionType, type LocationType, type Mood, type Trigger } from '@/types';
import { suggestionForTrigger } from '@/services/recommendationService';
import { xpEventId } from '@/services/rewardService';
import { nowIso } from '@/utils/dates';

const MOODS: Mood[] = ['calm', 'ok', 'tense', 'tired', 'irritated', 'sad'];
const LOCATIONS: LocationType[] = ['home', 'work', 'outside', 'social', 'other'];

export default function CravingLogScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const substance = useSubstance();
  const params = useLocalSearchParams<{ id?: string }>();
  const user = useUserStore((s) => s.user);
  const cravings = useCravingStore((s) => s.cravings);
  const addCraving = useCravingStore((s) => s.addCraving);
  const updateCraving = useCravingStore((s) => s.updateCraving);
  const awardXp = useRewardStore((s) => s.awardXp);
  const begin = useSosSession((s) => s.begin);
  const existing = params.id ? cravings.find((c) => c.id === params.id) : undefined;

  const [intensity, setIntensity] = useState<number | null>(existing?.intensity ?? null);
  const [trigger, setTrigger] = useState<Trigger | null>(existing?.trigger ?? null);
  const [mood, setMood] = useState<Mood | null>(existing?.mood ?? null);
  const [location, setLocation] = useState<LocationType | null>(existing?.locationType ?? null);
  const [context, setContext] = useState(existing?.context ?? '');
  const [outcome, setOutcome] = useState<CravingOutcome | null>(existing?.outcome ?? null);
  const [action, setAction] = useState<InterventionType | null>(existing?.interventionType ?? null);
  const [error, setError] = useState<string | null>(null);

  const suggestion = useMemo(() => (trigger && user ? suggestionForTrigger(trigger, user) : null), [trigger, user]);

  const buildPayload = () => ({
    intensity: intensity ?? 5,
    trigger: trigger ?? 'other',
    mood: mood ?? undefined,
    locationType: location ?? undefined,
    context: context.trim() || undefined,
  });

  const validate = () => {
    if (intensity === null || trigger === null) {
      setError(t('craving.errors.required'));
      return false;
    }
    return true;
  };

  const saveOnly = () => {
    if (!validate()) return;
    const payload = { ...buildPayload(), interventionType: action ?? 'none', outcome: outcome ?? undefined };
    let id = existing?.id;
    if (id) updateCraving(id, payload);
    else id = addCraving({ ...payload, occurredAt: nowIso() }).id;
    if (outcome === 'passed' || outcome === 'partly_passed') awardXp(xpEventId.craving(id), 'craving_overcome');
    router.back();
  };

  const startIntervention = (intervention: InterventionType) => {
    if (!validate()) return;
    const payload = buildPayload();
    let id = existing?.id;
    if (id) updateCraving(id, payload);
    else id = addCraving({ ...payload, occurredAt: nowIso() }).id;
    begin({ intervention, intensity, trigger, cravingId: id });
    const route = intervention === 'workout' ? '/sos/workout' : intervention === 'distraction' ? '/sos/distraction' : intervention === 'craving_surf' ? '/craving/surf' : '/sos/breathing';
    router.replace(route);
  };

  return (
    <Screen
      footer={
        <>
          {!existing && suggestion ? (
            <AppButton label={t('craving.startSuggested', { action: t(`interventions.${suggestion.intervention}`) })} icon="play" onPress={() => startIntervention(suggestion.intervention === 'replacement_ritual' ? 'breathing' : suggestion.intervention)} />
          ) : null}
          <AppButton label={t('common.save')} variant={existing || !suggestion ? 'primary' : 'secondary'} icon="checkmark" onPress={saveOnly} />
        </>
      }>
      <AppText variant="h1">{existing ? t('craving.editTitle') : t('craving.logTitle')}</AppText>
      <AppText tone="secondary">{t('craving.logSubtitle')}</AppText>
      <ScaleSelector label={t('craving.intensity')} value={intensity} onChange={setIntensity} min={1} max={10} minLabel={t('craving.intensityLow')} maxLabel={t('craving.intensityHigh')} />
      <ChipGroup label={t('craving.trigger')} options={triggersFor(substance).map((tr) => ({ value: tr, label: t(`triggers.${tr}`) }))} value={trigger} onChange={setTrigger} compact />
      {suggestion && trigger ? (
        <Banner text={`${t('craving.suggestion', { title: t(`alternatives.${trigger}.title`), text: t(`alternatives.${trigger}.text`) })}${suggestion.softened ? ` ${t('sos.softened')}` : ''}`} tone="success" icon="bulb-outline" />
      ) : null}
      <ChipGroup label={t('craving.mood')} options={MOODS.map((m) => ({ value: m, label: t(`moods.${m}`) }))} value={mood} onChange={setMood} compact />
      <ChipGroup label={t('craving.location')} options={LOCATIONS.map((l) => ({ value: l, label: t(`locations.${l}`) }))} value={location} onChange={setLocation} compact />
      <TextField label={t('craving.context')} value={context} onChangeText={setContext} maxLength={300} multiline />
      {existing ? (
        <>
          <ChipGroup
            label={t('craving.actionTaken')}
            options={(['breathing', 'workout', 'distraction', 'craving_surf', 'replacement_ritual', 'none'] as InterventionType[]).map((a) => ({ value: a, label: t(`interventions.${a}`) }))}
            value={action}
            onChange={setAction}
            compact
          />
          <ChipGroup label={t('craving.outcome')} options={(['passed', 'partly_passed', 'persisted'] as CravingOutcome[]).map((o) => ({ value: o, label: t(`outcomes.${o}`) }))} value={outcome} onChange={setOutcome} compact />
        </>
      ) : null}
      {error ? <Banner text={error} tone="danger" /> : null}
      <View>
        <AppText variant="caption" tone="secondary">
          {t('craving.timeAuto')}
        </AppText>
      </View>
    </Screen>
  );
}
