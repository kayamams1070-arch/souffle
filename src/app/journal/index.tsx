import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppButton, AppCard, AppText, ChipGroup, ConfirmDialog, EmptyState, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useJournalStore, useRewardStore, useSettingsStore } from '@/store';
import type { JournalEntryType, Mood } from '@/types';
import { xpEventId } from '@/services/rewardService';
import { formatDate } from '@/utils/money';
import { DAY_MS, nowIso } from '@/utils/dates';
import { useHaptics } from '@/hooks/useHaptics';

const TYPES: JournalEntryType[] = ['craving_overcome', 'workout_done', 'good_day', 'decision', 'gratitude', 'free'];
const MOODS: Mood[] = ['calm', 'ok', 'tense', 'tired', 'irritated', 'sad'];
const ICONS: Record<JournalEntryType, keyof typeof Ionicons.glyphMap> = {
  craving_overcome: 'hand-left-outline',
  workout_done: 'fitness-outline',
  good_day: 'sunny-outline',
  decision: 'compass-outline',
  gratitude: 'heart-outline',
  free: 'create-outline',
};

export default function JournalScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const haptics = useHaptics();
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const entries = useJournalStore((s) => s.entries);
  const addEntry = useJournalStore((s) => s.addEntry);
  const removeEntry = useJournalStore((s) => s.removeEntry);
  const awardXp = useRewardStore((s) => s.awardXp);
  const language = useSettingsStore((s) => s.settings.language);
  const [type, setType] = useState<JournalEntryType>((TYPES.includes(prefill as JournalEntryType) ? prefill : 'free') as JournalEntryType);
  const [text, setText] = useState('');
  const [mood, setMood] = useState<Mood | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [gained, setGained] = useState<number | null>(null);

  const weekly = useMemo(() => {
    const since = Date.now() - 7 * DAY_MS;
    const recent = entries.filter((e) => new Date(e.date).getTime() >= since);
    const counts: Partial<Record<JournalEntryType, number>> = {};
    for (const e of recent) counts[e.type] = (counts[e.type] ?? 0) + 1;
    return { total: recent.length, counts };
  }, [entries]);

  const save = () => {
    if (!text.trim()) return;
    const entry = addEntry({ date: nowIso(), type, text: text.trim(), mood: mood ?? undefined });
    const xp = awardXp(type === 'free' || type === 'gratitude' ? xpEventId.journal(entry.id) : xpEventId.victory(entry.id), type === 'free' || type === 'gratitude' ? 'journal_entry' : 'victory');
    setGained(xp);
    haptics.success();
    setText('');
    setMood(null);
  };

  return (
    <Screen>
      <ScreenHeader title={t('journal.title')} subtitle={t('journal.subtitle')} />
      <AppCard title={t('journal.newEntry')}>
        <View style={{ gap: 12 }}>
          <ChipGroup options={TYPES.map((ty) => ({ value: ty, label: t(`journal.types.${ty}`), icon: ICONS[ty] }))} value={type} onChange={setType} compact />
          <TextField label={t('journal.text')} value={text} onChangeText={setText} multiline maxLength={500} placeholder={t(`journal.placeholders.${type}`)} />
          <ChipGroup label={t('craving.mood')} options={MOODS.map((m) => ({ value: m, label: t(`moods.${m}`) }))} value={mood} onChange={setMood} compact />
          <AppButton label={t('common.save')} icon="checkmark" onPress={save} disabled={!text.trim()} />
          {gained !== null ? (
            <AppText variant="bodySmall" tone="warm" weight="semibold" accessibilityLiveRegion="polite">
              {gained > 0 ? t('journal.saved', { xp: gained }) : t('journal.savedNoXp')}
            </AppText>
          ) : null}
        </View>
      </AppCard>
      <AppCard title={t('journal.weekly')} tone="accent">
        <AppText tone="accent">{t('journal.weeklyTotal', { count: weekly.total })}</AppText>
        {Object.entries(weekly.counts).map(([k, v]) => (
          <AppText key={k} variant="bodySmall" tone="accent">
            • {t(`journal.types.${k}`)}: {v}
          </AppText>
        ))}
        <AppText variant="caption" tone="accent" style={{ marginTop: 6 }}>
          {t('journal.noObligation')}
        </AppText>
      </AppCard>
      {entries.length === 0 ? (
        <EmptyState title={t('journal.emptyTitle')} description={t('journal.emptyText')} icon="journal-outline" />
      ) : (
        <AppCard title={t('journal.timeline')}>
          {entries.slice(0, 50).map((e) => (
            <View key={e.id} style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
              <Ionicons name={ICONS[e.type]} size={20} color={theme.colors.accent} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <AppText variant="caption" tone="secondary">
                  {formatDate(e.date, language, true)} · {t(`journal.types.${e.type}`)}
                  {e.mood ? ` · ${t(`moods.${e.mood}`)}` : ''}
                </AppText>
                <AppText>{e.text}</AppText>
              </View>
              <AppButton label={t('common.delete')} variant="ghost" size="sm" fullWidth={false} onPress={() => setToDelete(e.id)} />
            </View>
          ))}
        </AppCard>
      )}
      <AppButton label={t('journal.reminderSettings')} variant="ghost" icon="notifications-outline" onPress={() => router.push('/settings/notifications')} />
      <ConfirmDialog visible={toDelete !== null} title={t('journal.deleteTitle')} confirmLabel={t('common.delete')} cancelLabel={t('common.cancel')} destructive onConfirm={() => { if (toDelete) removeEntry(toDelete); setToDelete(null); }} onCancel={() => setToDelete(null)} />
    </Screen>
  );
}
