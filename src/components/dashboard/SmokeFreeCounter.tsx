import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppCard, AppText, ProgressBar } from '@/components/ui';
import type { SmokeFreeState, ReductionSummary } from '@/utils/calculations';
import { formatDate } from '@/utils/money';
import type { Language } from '@/types';

function Unit({ value, label }: { value: number; label: string }) {
  const theme = useAppTheme();
  return (
    <View style={{ alignItems: 'center', minWidth: 64 }}>
      <AppText variant="display" weight="bold" style={{ color: theme.colors.primary, fontVariant: ['tabular-nums'] }}>
        {value < 10 && label !== 'd' ? `0${value}` : value}
      </AppText>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
    </View>
  );
}

export function SmokeFreeCounter({ state, language }: { state: SmokeFreeState; language: Language }) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  if (state.status === 'future') {
    const d = state.untilStart;
    return (
      <AppCard tone="primary" accessibilityLabel={t('dashboard.counter.futureA11y', { days: d.days, hours: d.hours, minutes: d.minutes })}>
        <AppText variant="bodySmall" tone="secondary">
          {t('dashboard.counter.futureTitle')}
        </AppText>
        <AppText variant="h2">{formatDate(state.since ?? '', language, true)}</AppText>
        <AppText variant="bodySmall" tone="secondary" style={{ marginTop: 4 }}>
          {t('dashboard.counter.futureHint')}
        </AppText>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 }}>
          <Unit value={d.days} label="d" />
          <Unit value={d.hours} label="h" />
          <Unit value={d.minutes} label="min" />
        </View>
      </AppCard>
    );
  }
  const d = state.duration;
  return (
    <AppCard accessibilityLabel={t('dashboard.counter.a11y', { days: d.days, hours: d.hours, minutes: d.minutes })}>
      <AppText variant="bodySmall" tone="secondary" weight="medium">
        {t('dashboard.counter.title')}
      </AppText>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 8, alignItems: 'flex-end' }}>
        <Unit value={d.days} label={t('units.d')} />
        <Unit value={d.hours} label={t('units.h')} />
        <Unit value={d.minutes} label={t('units.min')} />
        <View style={{ alignItems: 'center', minWidth: 48 }}>
          <AppText variant="h2" weight="medium" style={{ color: theme.colors.textSecondary, fontVariant: ['tabular-nums'] }}>
            {d.seconds < 10 ? `0${d.seconds}` : d.seconds}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {t('units.s')}
          </AppText>
        </View>
      </View>
      {state.since ? (
        <AppText variant="caption" tone="secondary" style={{ marginTop: 10 }}>
          {t('dashboard.counter.since', { date: formatDate(state.since, language, true) })}
        </AppText>
      ) : null}
    </AppCard>
  );
}

export function ReductionCounter({ stats }: { stats: ReductionSummary }) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const over = stats.todaySmoked > stats.target;
  const ratio = stats.target > 0 ? stats.todaySmoked / stats.target : stats.todaySmoked > 0 ? 1 : 0;
  return (
    <AppCard accessibilityLabel={t('dashboard.reduction.a11y', { smoked: stats.todaySmoked, target: stats.target })}>
      <AppText variant="bodySmall" tone="secondary" weight="medium">
        {t('dashboard.reduction.title')}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 6 }}>
        <AppText variant="display" weight="bold" style={{ color: over ? theme.colors.warm : theme.colors.primary }}>
          {stats.todaySmoked}
        </AppText>
        <AppText variant="h3" tone="secondary" style={{ marginBottom: 8 }}>
          / {stats.target} {t('units.cigsToday')}
        </AppText>
      </View>
      <ProgressBar value={Math.min(1, ratio)} tone={over ? 'warm' : 'accent'} accessibilityValueText={`${stats.todaySmoked}/${stats.target}`} />
      <AppText variant="bodySmall" tone="secondary" style={{ marginTop: 8 }}>
        {over ? t('dashboard.reduction.overTarget') : t('dashboard.reduction.underTarget', { left: stats.target - stats.todaySmoked })}
      </AppText>
      <AppText variant="caption" tone="secondary" style={{ marginTop: 4 }}>
        {t('dashboard.reduction.summary', { avoided: stats.cigarettesAvoided, days: stats.daysUnderTarget, total: stats.daysOnPlan })}
      </AppText>
    </AppCard>
  );
}
