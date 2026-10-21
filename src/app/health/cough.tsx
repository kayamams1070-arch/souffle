import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppButton, AppCard, AppText, Banner, ChipGroup, ConfirmDialog, EmptyState, ListRow, ScaleSelector, Screen, ScreenHeader, TextField } from '@/components/ui';
import { LineChart } from '@/components/charts/BarChart';
import { useJournalStore, useSettingsStore } from '@/store';
import { coughTrend } from '@/services/analyticsService';
import { addDaysToKey, dayKey } from '@/utils/dates';
import { formatDate } from '@/utils/money';
import type { CoughEntry } from '@/types';

const FREQUENCIES: CoughEntry['frequency'][] = ['rare', 'sometimes', 'often', 'constant'];

export default function CoughScreen() {
  const { t } = useTranslation();
  const cough = useJournalStore((s) => s.cough);
  const upsertCough = useJournalStore((s) => s.upsertCough);
  const removeCough = useJournalStore((s) => s.removeCough);
  const language = useSettingsStore((s) => s.settings.language);
  const [day, setDay] = useState<'today' | 'yesterday'>('today');
  const [intensity, setIntensity] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<CoughEntry['frequency'] | null>(null);
  const [note, setNote] = useState('');
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const trend = useMemo(() => coughTrend(cough), [cough]);
  const last = useMemo(() => cough.slice(-14), [cough]);

  const save = () => {
    if (intensity === null || frequency === null) return;
    upsertCough({ day: day === 'today' ? dayKey() : addDaysToKey(dayKey(), -1), intensity, frequency, note: note.trim() || undefined });
    setIntensity(null);
    setFrequency(null);
    setNote('');
    setSaved(true);
  };

  return (
    <Screen>
      <ScreenHeader title={t('cough.title')} subtitle={t('cough.subtitle')} />
      <Banner text={t('cough.medical')} tone="warm" icon="medkit-outline" />
      <AppCard title={t('cough.newEntry')}>
        <View style={{ gap: 12 }}>
          <ChipGroup options={[{ value: 'today', label: t('cough.today') }, { value: 'yesterday', label: t('cough.yesterday') }]} value={day} onChange={setDay} compact />
          <ScaleSelector label={t('cough.intensity')} value={intensity} onChange={(v) => { setIntensity(v); setSaved(false); }} min={0} max={10} minLabel={t('cough.none')} maxLabel={t('cough.strong')} />
          <ChipGroup label={t('cough.frequency')} options={FREQUENCIES.map((f) => ({ value: f, label: t(`cough.frequencies.${f}`) }))} value={frequency} onChange={setFrequency} compact />
          <TextField label={t('cough.note')} value={note} onChangeText={setNote} maxLength={300} multiline />
          <AppButton label={t('common.save')} icon="checkmark" onPress={save} disabled={intensity === null || frequency === null} />
          {saved ? (
            <AppText variant="bodySmall" tone="success" accessibilityLiveRegion="polite">
              {t('common.saved')}
            </AppText>
          ) : null}
        </View>
      </AppCard>
      {cough.length === 0 ? (
        <EmptyState title={t('cough.emptyTitle')} description={t('cough.emptyText')} icon="medical-outline" />
      ) : (
        <>
          {last.length >= 2 ? (
            <AppCard title={t('cough.trend')}>
              <LineChart data={last.map((c) => ({ label: c.day.slice(8), value: c.intensity }))} min={0} max={10} summary={t('cough.trendSummary', { count: last.length, first: last[0]!.intensity, last: last[last.length - 1]!.intensity })} />
            </AppCard>
          ) : null}
          {trend ? <Banner text={t(`cough.trends.${trend}`)} tone={trend === 'worsening' ? 'warm' : 'success'} /> : <Banner text={t('cough.needMore')} />}
          <AppCard title={t('cough.history')}>
            {[...cough].reverse().slice(0, 30).map((c) => (
              <ListRow
                key={c.id}
                icon="medical-outline"
                title={`${formatDate(c.day, language)} · ${c.intensity}/10 · ${t(`cough.frequencies.${c.frequency}`)}`}
                subtitle={c.note}
                chevron={false}
                right={<AppButton label={t('common.delete')} variant="ghost" size="sm" fullWidth={false} onPress={() => setToDelete(c.id)} />}
              />
            ))}
          </AppCard>
        </>
      )}
      <ConfirmDialog visible={toDelete !== null} title={t('common.deleteConfirm')} confirmLabel={t('common.delete')} cancelLabel={t('common.cancel')} destructive onConfirm={() => { if (toDelete) removeCough(toDelete); setToDelete(null); }} onCancel={() => setToDelete(null)} />
    </Screen>
  );
}
