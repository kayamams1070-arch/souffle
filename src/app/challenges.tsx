import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppButton, AppCard, AppText, Banner, ChipGroup, ConfirmDialog, EmptyState, NumberStepper, ProgressBar, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useCravingStore, useJournalStore, useSettingsStore, useUserStore, useWorkoutStore } from '@/store';
import { challengeProgress } from '@/services/challengeService';
import { addDaysToKey, dayKey, nowIso } from '@/utils/dates';
import { formatDate } from '@/utils/money';
import { useNow } from '@/hooks/useNow';
import type { Challenge } from '@/types';

const KINDS: Challenge['kind'][] = ['smoke_free_days', 'workouts', 'cravings_overcome'];
const DURATIONS = [7, 14, 30];

export default function ChallengesScreen() {
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const smokingEvents = useCravingStore((s) => s.smokingEvents);
  const cravings = useCravingStore((s) => s.cravings);
  const sessions = useWorkoutStore((s) => s.sessions);
  const challenges = useJournalStore((s) => s.challenges);
  const addChallenge = useJournalStore((s) => s.addChallenge);
  const removeChallenge = useJournalStore((s) => s.removeChallenge);
  const settings = useSettingsStore((s) => s.settings);
  const now = useNow(60_000);
  const [kind, setKind] = useState<Challenge['kind']>(user?.goal === 'reduce' ? 'workouts' : 'smoke_free_days');
  const [duration, setDuration] = useState(7);
  const [target, setTarget] = useState(5);
  const [title, setTitle] = useState('');
  const [toDelete, setToDelete] = useState<string | null>(null);
  const kinds = user?.goal === 'reduce' ? KINDS.filter((k) => k !== 'smoke_free_days') : KINDS;

  const create = () => {
    const start = dayKey(now);
    addChallenge({
      title: title.trim() || t(`challenges.kinds.${kind}`, { count: target }),
      startDay: start,
      endDay: addDaysToKey(start, duration - 1),
      kind,
      target: kind === 'smoke_free_days' ? Math.min(target, duration) : target,
      createdAt: nowIso(),
      isDemo: settings.demoMode,
    });
    setTitle('');
  };

  return (
    <Screen>
      <ScreenHeader title={t('challenges.title')} subtitle={t('challenges.subtitle')} />
      <Banner text={t('challenges.localOnly')} icon="phone-portrait-outline" />
      <AppCard title={t('challenges.newTitle')}>
        <View style={{ gap: 12 }}>
          <ChipGroup options={kinds.map((k) => ({ value: k, label: t(`challenges.kindLabels.${k}`) }))} value={kind} onChange={setKind} compact />
          <ChipGroup label={t('challenges.duration')} options={DURATIONS.map((d) => ({ value: d, label: t('units.daysCount', { count: d }) }))} value={duration} onChange={setDuration} compact />
          <NumberStepper label={t('challenges.target')} value={kind === 'smoke_free_days' ? Math.min(target, duration) : target} onChange={setTarget} min={1} max={kind === 'smoke_free_days' ? duration : 100} />
          <TextField label={t('challenges.name')} value={title} onChangeText={setTitle} maxLength={80} placeholder={t(`challenges.kinds.${kind}`, { count: target })} />
          <AppButton label={t('challenges.create')} icon="flag-outline" onPress={create} />
        </View>
      </AppCard>
      {challenges.length === 0 ? (
        <EmptyState title={t('challenges.emptyTitle')} description={t('challenges.emptyText')} icon="flag-outline" />
      ) : (
        challenges.map((c) => {
          const p = challengeProgress(c, { user, smokingEvents, sessions, cravings }, now);
          return (
            <AppCard key={c.id} title={c.title} subtitle={`${formatDate(c.startDay, settings.language)} → ${formatDate(c.endDay, settings.language)}`} tone={p.status === 'completed' ? 'accent' : 'default'}>
              <ProgressBar value={p.ratio} tone={p.status === 'completed' ? 'accent' : 'primary'} label={t('challenges.progress', { value: p.value, target: p.target })} />
              <AppText variant="caption" tone="secondary" style={{ marginTop: 6 }}>
                {t(`challenges.status.${p.status}`)}
                {c.isDemo ? ` · ${t('demo.tag')}` : ''}
              </AppText>
              <AppButton label={t('common.delete')} variant="ghost" size="sm" fullWidth={false} style={{ marginTop: 8 }} onPress={() => setToDelete(c.id)} />
            </AppCard>
          );
        })
      )}
      <ConfirmDialog visible={toDelete !== null} title={t('common.deleteConfirm')} confirmLabel={t('common.delete')} cancelLabel={t('common.cancel')} destructive onConfirm={() => { if (toDelete) removeChallenge(toDelete); setToDelete(null); }} onCancel={() => setToDelete(null)} />
    </Screen>
  );
}
