import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppButton, AppCard, AppText, Banner, Screen, StatCard } from '@/components/ui';
import { ReductionCounter, SmokeFreeCounter } from '@/components/dashboard/SmokeFreeCounter';
import { SavingsCard } from '@/components/dashboard/SavingsCard';
import { HealthTimeline } from '@/components/dashboard/HealthTimeline';
import { ForecastCard } from '@/components/dashboard/ForecastCard';
import { BadgeToast } from '@/components/dashboard/BadgeToast';
import { useDashboard } from '@/hooks/useDashboard';
import { useLevel, useRewardsSync, useStreak } from '@/hooks/useRewards';
import { useCravingStore, useRewardStore, useSettingsStore } from '@/store';
import { computeForecast } from '@/services/cravingPredictionService';
import { workoutDurationMinutes } from '@/services/recommendationService';
import { getBadge } from '@/data/badges';

export default function HomeScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { user, smokeFree, savings, reduction, milestones, nextWorkout, completedWorkouts } = useDashboard();
  const streak = useStreak();
  const level = useLevel();
  const { newlyUnlocked, dismiss } = useRewardsSync();
  const settings = useSettingsStore((s) => s.settings);
  const cravings = useCravingStore((s) => s.cravings);
  const badges = useRewardStore((s) => s.badges);
  const forecast = useMemo(() => computeForecast(cravings), [cravings]);
  const recentBadges = useMemo(() => [...badges].sort((a, b) => (a.unlockedAt < b.unlockedAt ? 1 : -1)).slice(0, 3), [badges]);

  if (!user) return null;
  const greeting = user.firstName ? t('dashboard.greetingName', { name: user.firstName }) : t('dashboard.greeting');
  const isNew = cravings.length === 0 && completedWorkouts === 0;

  return (
    <Screen insideTabs>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <AppText variant="h1">{greeting}</AppText>
          <AppText tone="secondary">{t('dashboard.subtitle')}</AppText>
        </View>
        <Ionicons name="leaf" size={32} color={theme.colors.accent} />
      </View>

      {settings.demoMode ? <Banner text={t('demo.banner')} tone="warm" /> : null}
      <BadgeToast badgeIds={newlyUnlocked} onDismiss={dismiss} />

      {user.goal === 'quit' && smokeFree ? (
        smokeFree.status === 'none' ? (
          <AppCard tone="primary">
            <AppText>{t('dashboard.counter.noDate')}</AppText>
            <AppButton label={t('dashboard.counter.setDate')} variant="secondary" style={{ marginTop: 10 }} onPress={() => router.push('/goal-settings')} />
          </AppCard>
        ) : (
          <SmokeFreeCounter state={smokeFree} language={settings.language} />
        )
      ) : null}
      {user.goal === 'reduce' && reduction ? (
        <>
          <ReductionCounter stats={reduction} />
          <AppButton label={t('dashboard.reduction.logCigarette')} variant="secondary" icon="add-circle-outline" onPress={() => router.push('/relapse?mode=reduction')} />
        </>
      ) : null}

      <AppButton label={t('dashboard.sosButton')} variant="sos" size="lg" icon="hand-left" onPress={() => router.push('/(tabs)/sos')} accessibilityHint={t('dashboard.sosHint')} />

      {isNew ? <Banner text={t('dashboard.emptyHint')} tone="success" icon="sparkles-outline" /> : null}

      {savings ? (
        <SavingsCard
          savedCents={savings.savedCents}
          avoided={savings.cigarettesAvoided}
          oneYear={savings.projectionOneYearCents}
          fiveYears={savings.projectionFiveYearsCents}
          tenYears={savings.projectionTenYearsCents}
          language={settings.language}
          project={user.savingsProject}
          reduction={user.goal === 'reduce'}
          onPress={() => router.push('/health/benefits')}
        />
      ) : null}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatCard label={t('dashboard.streak')} value={streak.frozen ? t('dashboard.frozen') : t('units.daysCount', { count: streak.currentDays })} hint={t('dashboard.best', { count: streak.bestDays })} icon="flame-outline" onPress={() => router.push('/streak')} />
        <StatCard label={t('dashboard.shield')} value={streak.shieldAvailable ? t('dashboard.shieldReady') : t('dashboard.shieldUsed')} hint={t('dashboard.shieldHint')} icon="shield-half-outline" onPress={() => router.push('/streak')} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatCard label={t('dashboard.xp')} value={`${level.xp} XP`} hint={t('dashboard.level', { level: level.level, current: level.current, needed: level.needed })} icon="star-outline" onPress={() => router.push('/badges')} />
        <StatCard label={t('dashboard.workouts')} value={String(completedWorkouts)} hint={t('dashboard.workoutsHint')} icon="fitness-outline" onPress={() => router.push('/(tabs)/sport')} />
      </View>

      {nextWorkout ? (
        <AppCard title={t('dashboard.nextWorkout')} subtitle={t('program.weekLabel', { week: nextWorkout.week })} onPress={() => router.push({ pathname: '/workout/[id]', params: { id: nextWorkout.workout.id } })} tone="primary">
          <AppText weight="semibold">{t(`workouts.${nextWorkout.workout.key}.title`)}</AppText>
          <AppText variant="bodySmall" tone="secondary">
            {t('workout.aboutMinutes', { count: workoutDurationMinutes(nextWorkout.workout) })} · {t('program.doneThisWeek', { done: nextWorkout.doneThisWeek, total: 3 })}
          </AppText>
        </AppCard>
      ) : null}

      {user.goal === 'quit' && smokeFree?.status === 'running' ? (
        <HealthTimeline elapsedMinutes={smokeFree.duration.totalMs / 60_000} reached={milestones.reached} next={milestones.next} compact onPress={() => router.push('/health/benefits')} />
      ) : null}

      {settings.cravingForecastEnabled ? <ForecastCard forecast={forecast} onPress={() => router.push('/craving/history')} /> : null}

      {recentBadges.length > 0 ? (
        <AppCard title={t('dashboard.recentBadges')} onPress={() => router.push('/badges')}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            {recentBadges.map((b) => {
              const def = getBadge(b.id);
              if (!def) return null;
              return (
                <View key={b.id} style={{ alignItems: 'center', width: 80, gap: 4 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.warmSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={def.icon as never} size={24} color={theme.colors.warmText} />
                  </View>
                  <AppText variant="caption" align="center" numberOfLines={2}>
                    {t(`badges.${def.key}.title`)}
                  </AppText>
                </View>
              );
            })}
          </View>
        </AppCard>
      ) : null}

      <AppCard tone="alt" onPress={() => router.push('/pact')} title={t('dashboard.pactTitle')}>
        <AppText variant="bodySmall" tone="secondary" numberOfLines={2}>
          {user.why || t('dashboard.pactHint')}
        </AppText>
      </AppCard>

      {user.goal === 'quit' ? (
        <AppButton label={t('dashboard.smokedButton')} variant="ghost" icon="cloud-outline" onPress={() => router.push('/relapse')} accessibilityHint={t('dashboard.smokedHint')} />
      ) : null}
    </Screen>
  );
}
