import React, { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppCard, EmptyState, ListRow, Screen, ScreenHeader } from '@/components/ui';
import { BarChart } from '@/components/charts/BarChart';
import { useSettingsStore, useWorkoutStore } from '@/store';
import { computeWorkoutStats } from '@/services/analyticsService';
import { getWorkout } from '@/data/workouts';
import { formatDate } from '@/utils/money';
import { formatMinutesAsClock } from '@/utils/dates';

export default function WorkoutHistoryScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const sessions = useWorkoutStore((s) => s.sessions);
  const language = useSettingsStore((s) => s.settings.language);
  const stats = useMemo(() => computeWorkoutStats(sessions), [sessions]);
  const list = useMemo(() => sessions.filter((s) => s.completedAt).slice(0, 50), [sessions]);

  return (
    <Screen>
      <ScreenHeader title={t('sport.history.title')} />
      {list.length === 0 ? (
        <EmptyState title={t('sport.history.emptyTitle')} description={t('sport.history.empty')} icon="fitness-outline" actionLabel={t('tabs.sport')} onAction={() => router.back()} />
      ) : (
        <>
          <AppCard title={t('sport.history.weekly')}>
            <BarChart data={stats.weekly.map((w) => ({ label: w.weekStart.slice(5), value: w.count }))} color={theme.colors.accent} summary={t('sport.history.weeklySummary', { count: stats.completed, minutes: stats.totalMinutes })} />
          </AppCard>
          <AppCard title={t('sport.history.list')}>
            {list.map((s) => {
              const w = getWorkout(s.workoutId);
              return (
                <ListRow
                  key={s.id}
                  icon={s.completed ? 'checkmark-circle' : 'remove-circle-outline'}
                  iconColor={s.completed ? theme.colors.success : theme.colors.textSecondary}
                  title={w ? t(`workouts.${w.key}.title`) : s.workoutId}
                  subtitle={`${formatDate(s.completedAt ?? s.startedAt, language, true)} · ${formatMinutesAsClock(s.durationSeconds)} · ${s.blocksCompleted}/${s.totalBlocks}${s.perceivedEffort ? ` · ${t('workout.complete.effortShort', { value: s.perceivedEffort })}` : ''}`}
                  chevron={false}
                />
              );
            })}
          </AppCard>
        </>
      )}
    </Screen>
  );
}
