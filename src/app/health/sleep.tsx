import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { AppButton, AppCard, AppText, Banner, ChipGroup, ConfirmDialog, EmptyState, ListRow, NumberStepper, ScaleSelector, Screen, ScreenHeader, TextField } from '@/components/ui';
import { LineChart } from '@/components/charts/BarChart';
import { useCravingStore, useJournalStore, useSettingsStore } from '@/store';
import { averageSleep } from '@/services/analyticsService';
import { addDaysToKey, dayKey } from '@/utils/dates';
import { formatDate } from '@/utils/money';

export default function SleepScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const sleep = useJournalStore((s) => s.sleep);
  const upsertSleep = useJournalStore((s) => s.upsertSleep);
  const removeSleep = useJournalStore((s) => s.removeSleep);
  const cravings = useCravingStore((s) => s.cravings);
  const language = useSettingsStore((s) => s.settings.language);
  const [day, setDay] = useState<'today' | 'yesterday'>('today');
  const [hours, setHours] = useState(7);
  const [minutes, setMinutes] = useState(0);
  const [quality, setQuality] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [toDelete, setToDelete] = useState<string | null>(null);
  const avg = useMemo(() => averageSleep(sleep), [sleep]);
  const last14 = useMemo(() => sleep.slice(-14), [sleep]);

  // Simple side-by-side: cravings on nights with low (<=2) vs good (>=4) sleep quality (no causal claim).
  const comparison = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const c of cravings) {
      const k = dayKey(c.occurredAt);
      byDay.set(k, (byDay.get(k) ?? 0) + 1);
    }
    const low = sleep.filter((s) => s.quality <= 2);
    const good = sleep.filter((s) => s.quality >= 4);
    if (low.length < 3 || good.length < 3) return null;
    const avgFor = (items: typeof sleep) => items.reduce((sum, s) => sum + (byDay.get(s.day) ?? 0), 0) / items.length;
    return { low: Math.round(avgFor(low) * 10) / 10, good: Math.round(avgFor(good) * 10) / 10 };
  }, [sleep, cravings]);

  const save = () => {
    if (quality === null) return;
    upsertSleep({ day: day === 'today' ? dayKey() : addDaysToKey(dayKey(), -1), durationMinutes: hours * 60 + minutes, quality, note: note.trim() || undefined });
    setNote('');
    setQuality(null);
  };

  return (
    <Screen>
      <ScreenHeader title={t('sleep.title')} subtitle={t('sleep.subtitle')} />
      <AppButton label={t('nights.title')} variant="secondary" icon="bed-outline" onPress={() => router.push('/health/nights')} />
      <AppCard title={t('sleep.newEntry')}>
        <View style={{ gap: 12 }}>
          <ChipGroup options={[{ value: 'today', label: t('sleep.lastNight') }, { value: 'yesterday', label: t('sleep.nightBefore') }]} value={day} onChange={setDay} compact />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <NumberStepper label={t('units.hours')} value={hours} onChange={setHours} min={0} max={16} />
            </View>
            <View style={{ flex: 1 }}>
              <NumberStepper label={t('units.minutes')} value={minutes} onChange={setMinutes} min={0} max={45} step={15} />
            </View>
          </View>
          <ScaleSelector label={t('sleep.quality')} value={quality} onChange={setQuality} min={1} max={5} minLabel={t('sleep.poor')} maxLabel={t('sleep.great')} />
          <TextField label={t('sleep.note')} value={note} onChangeText={setNote} maxLength={200} />
          <AppButton label={t('common.save')} icon="checkmark" onPress={save} disabled={quality === null} />
        </View>
      </AppCard>
      {sleep.length === 0 ? (
        <EmptyState title={t('sleep.emptyTitle')} description={t('sleep.emptyText')} icon="moon-outline" />
      ) : (
        <>
          {avg ? (
            <AppCard tone="primary">
              <AppText variant="bodySmall" tone="secondary">
                {t('sleep.average7')}
              </AppText>
              <AppText variant="h2">
                {Math.floor(avg.durationMinutes / 60)}h{String(avg.durationMinutes % 60).padStart(2, '0')} · {avg.quality}/5
              </AppText>
            </AppCard>
          ) : null}
          {last14.length >= 2 ? (
            <AppCard title={t('sleep.trend')}>
              <LineChart data={last14.map((s) => ({ label: s.day.slice(8), value: s.quality }))} min={1} max={5} summary={t('sleep.trendSummary', { count: last14.length })} />
            </AppCard>
          ) : null}
          {comparison ? (
            <AppCard title={t('sleep.comparisonTitle')} tone="alt">
              <AppText variant="bodySmall">{t('sleep.comparisonText', { low: comparison.low, good: comparison.good })}</AppText>
              <AppText variant="caption" tone="secondary" style={{ marginTop: 6 }}>
                {t('sleep.noCausal')}
              </AppText>
            </AppCard>
          ) : (
            <Banner text={t('sleep.needMore')} />
          )}
          <AppCard title={t('sleep.history')}>
            {[...sleep].reverse().slice(0, 30).map((s) => (
              <ListRow key={s.id} icon="moon-outline" title={`${formatDate(s.day, language)} · ${Math.floor(s.durationMinutes / 60)}h${String(s.durationMinutes % 60).padStart(2, '0')} · ${s.quality}/5`} subtitle={s.note} chevron={false} right={<AppButton label={t('common.delete')} variant="ghost" size="sm" fullWidth={false} onPress={() => setToDelete(s.id)} />} />
            ))}
          </AppCard>
        </>
      )}
      <ConfirmDialog visible={toDelete !== null} title={t('common.deleteConfirm')} confirmLabel={t('common.delete')} cancelLabel={t('common.cancel')} destructive onConfirm={() => { if (toDelete) removeSleep(toDelete); setToDelete(null); }} onCancel={() => setToDelete(null)} />
    </Screen>
  );
}
