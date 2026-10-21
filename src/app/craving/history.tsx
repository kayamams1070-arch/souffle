import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppButton, AppCard, AppText, ChipGroup, EmptyState, ListRow, Screen, ScreenHeader, StatCard } from '@/components/ui';
import { BarChart } from '@/components/charts/BarChart';
import { ForecastCard } from '@/components/dashboard/ForecastCard';
import { useCravingStore, useSettingsStore } from '@/store';
import { computeCravingStats, filterByPeriod, type Period } from '@/services/analyticsService';
import { computeForecast } from '@/services/cravingPredictionService';
import { formatDate } from '@/utils/money';


export default function CravingHistoryScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.settings.language);
  const forecastEnabled = useSettingsStore((s) => s.settings.cravingForecastEnabled);
  const cravings = useCravingStore((s) => s.cravings);
  const [period, setPeriod] = useState<Period>('30d');
  const filtered = useMemo(() => filterByPeriod(cravings, period), [cravings, period]);
  const stats = useMemo(() => computeCravingStats(filtered), [filtered]);
  const forecast = useMemo(() => computeForecast(cravings), [cravings]);
  const enough = filtered.length >= 3;

  return (
    <Screen>
      <ScreenHeader title={t('craving.historyTitle')} />
      <ChipGroup
        options={[
          { value: '7d', label: t('periods.7d') },
          { value: '30d', label: t('periods.30d') },
          { value: 'all', label: t('periods.all') },
        ]}
        value={period}
        onChange={setPeriod}
        compact
      />
      {filtered.length === 0 ? (
        <EmptyState title={t('craving.emptyTitle')} description={t('craving.emptyDescription')} icon="cloud-outline" actionLabel={t('craving.logTitle')} onAction={() => router.push('/craving/log')} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatCard label={t('craving.stats.count')} value={String(stats.count)} icon="cloud-outline" />
            <StatCard label={t('craving.stats.avgIntensity')} value={stats.averageIntensity !== null ? `${stats.averageIntensity}/10` : '–'} icon="pulse-outline" />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatCard label={t('craving.stats.overcome')} value={String(stats.overcome)} icon="checkmark-circle-outline" tone="accent" />
            <StatCard label={t('craving.stats.overcomeRate')} value={stats.overcomeRate !== null ? `${Math.round(stats.overcomeRate * 100)}%` : '–'} hint={stats.overcomeRate === null ? t('craving.stats.noOutcome') : undefined} icon="trending-up-outline" tone="accent" />
          </View>
          {!enough ? <AppText variant="bodySmall" tone="secondary">{t('craving.stats.fewData')}</AppText> : null}
          {enough ? (
            <>
              <AppCard title={t('craving.charts.byHour')}>
                <BarChart data={stats.byHour.map((v, h) => ({ label: `${h}h`, value: v }))} labelEvery={3} summary={t('craving.charts.byHourSummary', { hour: stats.byHour.indexOf(Math.max(...stats.byHour)) })} />
              </AppCard>
              <AppCard title={t('craving.charts.byWeekday')}>
                <BarChart data={[1, 2, 3, 4, 5, 6, 0].map((d) => ({ label: t(`weekdaysShort.${d}`), value: stats.byWeekday[d] ?? 0 }))} color={theme.colors.accent} summary={t('craving.charts.byWeekdaySummary', { day: t(`weekdays.${stats.byWeekday.indexOf(Math.max(...stats.byWeekday))}`) })} />
              </AppCard>
              <AppCard title={t('craving.charts.last14')}>
                <BarChart data={stats.dailyLast14.map((d) => ({ label: d.day.slice(8), value: d.count }))} labelEvery={2} color={theme.colors.warm} summary={t('craving.charts.last14Summary', { count: stats.dailyLast14.reduce((s, d) => s + d.count, 0) })} />
              </AppCard>
              <AppCard title={t('craving.charts.triggers')}>
                {stats.byTrigger.slice(0, 5).map((tr) => (
                  <View key={tr.trigger} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                    <AppText>{t(`triggers.${tr.trigger}`)}</AppText>
                    <AppText weight="semibold">{tr.count}</AppText>
                  </View>
                ))}
              </AppCard>
              {stats.byIntervention.length > 0 ? (
                <AppCard title={t('craving.charts.interventions')} subtitle={t('craving.charts.interventionsHint')}>
                  {stats.byIntervention.map((iv) => (
                    <View key={iv.intervention} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                      <AppText>{t(`interventions.${iv.intervention}`)}</AppText>
                      <AppText weight="semibold">
                        {Math.round(iv.successRate * 100)}% ({iv.count})
                      </AppText>
                    </View>
                  ))}
                </AppCard>
              ) : null}
            </>
          ) : null}
          {forecastEnabled ? <ForecastCard forecast={forecast} /> : null}
          <AppCard title={t('craving.list')}>
            {filtered.slice(0, 30).map((c) => (
              <ListRow
                key={c.id}
                icon={c.outcome === 'passed' ? 'checkmark-circle-outline' : c.outcome === 'partly_passed' ? 'trending-down-outline' : 'cloud-outline'}
                iconColor={c.outcome === 'passed' ? theme.colors.success : undefined}
                title={`${t(`triggers.${c.trigger}`)} · ${c.intensity}/10`}
                subtitle={`${formatDate(c.occurredAt, language, true)}${c.interventionType && c.interventionType !== 'none' ? ` · ${t(`interventions.${c.interventionType}`)}` : ''}${c.outcome ? ` · ${t(`outcomes.${c.outcome}`)}` : ''}`}
                onPress={() => router.push({ pathname: '/craving/log', params: { id: c.id } })}
              />
            ))}
            {filtered.length > 30 ? (
              <AppText variant="caption" tone="secondary" style={{ marginTop: 8 }}>
                {t('craving.moreHidden', { count: filtered.length - 30 })}
              </AppText>
            ) : null}
          </AppCard>
        </>
      )}
      <AppButton label={t('craving.logTitle')} icon="add" onPress={() => router.push('/craving/log')} />
    </Screen>
  );
}
