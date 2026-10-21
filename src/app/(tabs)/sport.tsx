import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppButton, AppCard, AppText, Banner, ChipGroup, ListRow, Screen, StatCard } from '@/components/ui';
import { useSettingsStore, useUserStore, useWorkoutStore } from '@/store';
import { PROGRAM, phaseForWeek } from '@/data/program';
import { getWorkout, THEMATIC_WORKOUTS } from '@/data/workouts';
import { adaptWorkout, currentProgramWeek, effectiveLevel, isLevelAvailable, unlockedLevel, workoutDurationMinutes } from '@/services/recommendationService';
import { computeWorkoutStats } from '@/services/analyticsService';
import { LEVEL_UNLOCK } from '@/utils/constants';
import { formatDate } from '@/utils/money';
import { useNow } from '@/hooks/useNow';
import type { SportLevel } from '@/types';

export default function SportScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const sessions = useWorkoutStore((s) => s.sessions);
  const activeLevel = useWorkoutStore((s) => s.activeLevel);
  const setActiveLevel = useWorkoutStore((s) => s.setActiveLevel);
  const language = useSettingsStore((s) => s.settings.language);
  const [viewWeek, setViewWeek] = useState<number | null>(null);
  const now = useNow(60_000);

  const stats = useMemo(() => computeWorkoutStats(sessions), [sessions]);
  const week = useMemo(() => currentProgramWeek(sessions), [sessions]);
  const shownWeek = viewWeek ?? week;
  const level: SportLevel = user ? effectiveLevel(user, sessions, activeLevel) : 'beginner';
  const unlocked = useMemo(() => unlockedLevel(sessions), [sessions]);
  const program = PROGRAM[shownWeek - 1];
  const phase = phaseForWeek(shownWeek);
  if (!user || !program) return null;

  const doneThisWeekIds = new Set(
    sessions
      .filter((s) => s.completed && now - new Date(s.completedAt ?? s.startedAt).getTime() < 7 * 24 * 3600 * 1000)
      .map((s) => s.workoutId)
  );

  return (
    <Screen insideTabs>
      <AppText variant="h1">{t('sport.title')}</AppText>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatCard label={t('sport.stats.completed')} value={String(stats.completed)} icon="checkmark-done-outline" />
        <StatCard label={t('sport.stats.minutes')} value={String(stats.totalMinutes)} icon="time-outline" />
        <StatCard label={t('sport.stats.thisWeek')} value={`${stats.thisWeek}/3`} icon="calendar-outline" />
      </View>

      <AppCard title={t('sport.level.title')} subtitle={t('sport.level.subtitle')}>
        <ChipGroup
          options={(['beginner', 'intermediate', 'advanced'] as SportLevel[]).map((l) => ({
            value: l,
            label: isLevelAvailable(l, user, sessions) ? t(`level.${l}`) : `🔒 ${t(`level.${l}`)}`,
          }))}
          value={level}
          onChange={(l) => {
            if (isLevelAvailable(l, user, sessions)) setActiveLevel(l);
          }}
          compact
        />
        <AppText variant="caption" tone="secondary" style={{ marginTop: 8 }}>
          {unlocked === 'advanced'
            ? t('sport.level.allUnlocked')
            : unlocked === 'intermediate'
              ? t('sport.level.unlockAdvanced', { workouts: LEVEL_UNLOCK.advanced.minWorkouts, weeks: LEVEL_UNLOCK.advanced.minDistinctWeeks })
              : t('sport.level.unlockIntermediate', { workouts: LEVEL_UNLOCK.intermediate.minWorkouts, weeks: LEVEL_UNLOCK.intermediate.minDistinctWeeks })}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {t('sport.level.neverForced')}
        </AppText>
      </AppCard>

      <AppCard
        title={t('program.weekLabel', { week: shownWeek })}
        subtitle={`${t(`program.phases.${phase.key}.title`)} · ${t('program.phaseWeeks', { from: phase.weeks[0], to: phase.weeks[1] })}`}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <AppButton label={t('common.previous')} variant="ghost" size="sm" fullWidth={false} disabled={shownWeek <= 1} onPress={() => setViewWeek(shownWeek - 1)} />
          {shownWeek !== week ? <AppButton label={t('program.backToCurrent')} variant="secondary" size="sm" fullWidth={false} onPress={() => setViewWeek(null)} /> : null}
          <AppButton label={t('common.next')} variant="ghost" size="sm" fullWidth={false} disabled={shownWeek >= 12} onPress={() => setViewWeek(shownWeek + 1)} />
        </View>
        <AppText variant="bodySmall" tone="secondary">
          {t(`program.phases.${phase.key}.description`)}
        </AppText>
        <AppText variant="bodySmall" weight="semibold" style={{ marginTop: 8 }}>
          {t('program.goal')}: <AppText variant="bodySmall">{t(`program.weeks.w${shownWeek}.goal`)}</AppText>
        </AppText>
        <AppText variant="bodySmall" style={{ marginTop: 4 }}>
          {t('program.sessionsPerWeek', { count: program.recommendedSessions })}
        </AppText>
        <View style={{ marginTop: 8 }}>
          {program.workoutIds[level].map((id) => {
            const w = getWorkout(id);
            if (!w) return null;
            const adapted = adaptWorkout(w, user.limitations, user.intensityPreference);
            const done = doneThisWeekIds.has(id) && shownWeek === week;
            return (
              <ListRow
                key={id}
                icon={done ? 'checkmark-circle' : w.isRecoverySession ? 'leaf-outline' : 'fitness-outline'}
                iconColor={done ? theme.colors.success : undefined}
                title={t(`workouts.${w.key}.title`)}
                subtitle={`${t('workout.aboutMinutes', { count: workoutDurationMinutes(adapted) })} · ${t('workout.exercisesCount', { count: adapted.blocks.length })}`}
                onPress={() => router.push({ pathname: '/workout/[id]', params: { id } })}
              />
            );
          })}
        </View>
        <AppText variant="caption" tone="secondary" style={{ marginTop: 10 }}>
          {t('program.hardDay')}: {t(`program.weeks.w${shownWeek}.hardDay`)}
        </AppText>
        <AppText variant="caption" tone="secondary" style={{ marginTop: 4 }}>
          {t('program.review')}: {t(`program.weeks.w${shownWeek}.review`)}
        </AppText>
      </AppCard>

      <AppCard title={t('sport.thematic.title')} subtitle={t('sport.thematic.subtitle')}>
        {THEMATIC_WORKOUTS.map((w) => (
          <ListRow key={w.id} icon="flash-outline" title={t(`workouts.${w.key}.title`)} subtitle={t('workout.aboutMinutes', { count: workoutDurationMinutes(w) })} onPress={() => router.push({ pathname: '/workout/[id]', params: { id: w.id } })} />
        ))}
      </AppCard>

      <AppCard title={t('breathingTest.title')} subtitle={t('breathingTest.cardSubtitle')} onPress={() => router.push('/health/breathing-test')} tone="accent">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="pulse-outline" size={20} color={theme.colors.accentText} />
          <AppText variant="bodySmall" tone="accent">
            {t('breathingTest.cardHint')}
          </AppText>
        </View>
      </AppCard>

      <AppCard title={t('coach.title')} subtitle={t('coach.subtitle')} onPress={() => router.push('/coach')} tone="primary">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.primary} />
          <AppText variant="bodySmall">{t('coach.cardHint')}</AppText>
        </View>
      </AppCard>

      {stats.lastSessionAt ? (
        <AppCard title={t('sport.history.title')} onPress={() => router.push('/workout/history')}>
          <AppText variant="bodySmall" tone="secondary">
            {t('sport.history.last', { date: formatDate(stats.lastSessionAt, language, true) })}
          </AppText>
        </AppCard>
      ) : (
        <Banner text={t('sport.history.empty')} tone="success" icon="sparkles-outline" />
      )}
      {user.limitations.length > 0 ? <Banner text={t('sport.adaptedNote')} icon="shield-checkmark-outline" /> : null}
    </Screen>
  );
}
