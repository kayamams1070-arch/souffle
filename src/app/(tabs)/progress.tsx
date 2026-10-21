import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppCard, AppText, ListRow, ProgressBar, Screen, StatCard } from '@/components/ui';
import { BarChart } from '@/components/charts/BarChart';
import { useCravingStore, useJournalStore, useRewardStore, useUserStore, useWorkoutStore } from '@/store';
import { useLevel, useStreak } from '@/hooks/useRewards';
import { computeCravingStats, computeWorkoutStats } from '@/services/analyticsService';
import { BADGES } from '@/data/badges';
import { totalSmokeFreeDays } from '@/utils/streaks';

export default function ProgressScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const cravings = useCravingStore((s) => s.cravings);
  const smokingEvents = useCravingStore((s) => s.smokingEvents);
  const sessions = useWorkoutStore((s) => s.sessions);
  const badges = useRewardStore((s) => s.badges);
  const entries = useJournalStore((s) => s.entries);
  const sleep = useJournalStore((s) => s.sleep);
  const cough = useJournalStore((s) => s.cough);
  const streak = useStreak();
  const level = useLevel();
  const cravingStats = useMemo(() => computeCravingStats(cravings), [cravings]);
  const workoutStats = useMemo(() => computeWorkoutStats(sessions), [sessions]);
  const smokeFreeDays = useMemo(() => (user ? totalSmokeFreeDays(user, smokingEvents) : 0), [user, smokingEvents]);

  return (
    <Screen insideTabs>
      <AppText variant="h1">{t('progress.title')}</AppText>

      <AppCard title={t('progress.levelTitle', { level: level.level })} subtitle={t('progress.xpTotal', { xp: level.xp })} onPress={() => router.push('/badges')}>
        <ProgressBar value={level.needed ? level.current / level.needed : 0} accessibilityValueText={`${level.current}/${level.needed} XP`} label={t('progress.nextLevel', { xp: level.needed - level.current })} tone="warm" />
        <AppText variant="caption" tone="secondary" style={{ marginTop: 8 }}>
          {t('progress.badgesCount', { count: badges.length, total: BADGES.length })}
        </AppText>
      </AppCard>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatCard label={t('dashboard.streak')} value={t('units.daysCount', { count: streak.currentDays })} hint={t('dashboard.best', { count: streak.bestDays })} icon="flame-outline" onPress={() => router.push('/streak')} />
        <StatCard label={t('progress.smokeFreeDays')} value={String(smokeFreeDays)} hint={t('progress.smokeFreeDaysHint')} icon="sunny-outline" tone="accent" />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatCard label={t('craving.stats.overcome')} value={String(cravingStats.overcome)} hint={t('progress.ofCravings', { count: cravingStats.count })} icon="hand-left-outline" onPress={() => router.push('/craving/history')} />
        <StatCard label={t('sport.stats.completed')} value={String(workoutStats.completed)} hint={t('sport.stats.minutesHint', { count: workoutStats.totalMinutes })} icon="fitness-outline" onPress={() => router.push('/workout/history')} />
      </View>

      {cravingStats.count >= 3 ? (
        <AppCard title={t('craving.charts.last14')} onPress={() => router.push('/craving/history')}>
          <BarChart data={cravingStats.dailyLast14.map((d) => ({ label: d.day.slice(8), value: d.count }))} labelEvery={2} color={theme.colors.warm} summary={t('craving.charts.last14Summary', { count: cravingStats.dailyLast14.reduce((s, d) => s + d.count, 0) })} height={120} />
        </AppCard>
      ) : null}

      <AppCard title={t('progress.sections')}>
        <ListRow icon="ribbon-outline" title={t('badges.title')} subtitle={t('progress.badgesCount', { count: badges.length, total: BADGES.length })} onPress={() => router.push('/badges')} />
        <ListRow icon="flame-outline" title={t('streak.title')} subtitle={t('streak.subtitle')} onPress={() => router.push('/streak')} />
        <ListRow icon="cloud-outline" title={t('craving.historyTitle')} subtitle={t('progress.cravingsHint', { count: cravingStats.count })} onPress={() => router.push('/craving/history')} />
        <ListRow icon="journal-outline" title={t('journal.title')} subtitle={t('progress.journalHint', { count: entries.length })} onPress={() => router.push('/journal')} />
        <ListRow icon="moon-outline" title={t('sleep.title')} subtitle={t('progress.sleepHint', { count: sleep.length })} onPress={() => router.push('/health/sleep')} />
        <ListRow icon="medical-outline" title={t('cough.title')} subtitle={t('progress.coughHint', { count: cough.length })} onPress={() => router.push('/health/cough')} />
        <ListRow icon="heart-outline" title={t('benefits.title')} subtitle={t('benefits.subtitle')} onPress={() => router.push('/health/benefits')} />
        <ListRow icon="pulse-outline" title={t('breathingTest.title')} subtitle={t('breathingTest.cardSubtitle')} onPress={() => router.push('/health/breathing-test')} />
        <ListRow icon="document-text-outline" title={t('reports.title')} subtitle={t('reports.subtitle')} onPress={() => router.push('/reports')} />
        <ListRow icon="people-outline" title={t('challenges.title')} subtitle={t('challenges.subtitle')} onPress={() => router.push('/challenges')} />
      </AppCard>
    </Screen>
  );
}
