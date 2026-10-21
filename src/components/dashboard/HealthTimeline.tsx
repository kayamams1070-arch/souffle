import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppCard, AppText, ProgressBar } from '@/components/ui';
import type { HealthMilestone } from '@/types';
import { HEALTH_MILESTONES } from '@/data/healthMilestones';

interface Props {
  elapsedMinutes: number;
  reached: HealthMilestone[];
  next: HealthMilestone | undefined;
  compact?: boolean;
  onPress?: () => void;
}

export function milestoneLabel(m: HealthMilestone, t: (k: string, o?: Record<string, unknown>) => string): string {
  const min = m.afterMinutes;
  if (min < 60) return t('health.after.minutes', { count: min });
  if (min < 24 * 60) return t('health.after.hours', { count: Math.round(min / 60) });
  if (min < 14 * 24 * 60) return t('health.after.days', { count: Math.round(min / (24 * 60)) });
  if (min < 60 * 24 * 60) return t('health.after.weeks', { count: Math.round(min / (7 * 24 * 60)) });
  if (min < 365 * 24 * 60) return t('health.after.months', { count: Math.round(min / (30 * 24 * 60)) });
  return t('health.after.years', { count: Math.round(min / (365 * 24 * 60)) });
}

export function HealthTimeline({ elapsedMinutes, reached, next, compact, onPress }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const list = compact ? HEALTH_MILESTONES.slice(0, 5) : HEALTH_MILESTONES;
  const reachedIds = new Set(reached.map((m) => m.id));
  const prevMinutes = reached.length ? reached[reached.length - 1]!.afterMinutes : 0;
  const nextProgress = next ? (elapsedMinutes - prevMinutes) / (next.afterMinutes - prevMinutes) : 1;
  return (
    <AppCard title={t('health.timeline.title')} subtitle={t('health.timeline.subtitle')} onPress={onPress}>
      {next ? (
        <View style={{ marginBottom: 12 }}>
          <ProgressBar value={nextProgress} label={t('health.timeline.next', { label: milestoneLabel(next, t) })} tone="accent" />
        </View>
      ) : null}
      <View style={{ gap: 10 }}>
        {list.map((m) => {
          const done = reachedIds.has(m.id);
          const isNext = next?.id === m.id;
          return (
            <View key={m.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', opacity: done || isNext ? 1 : 0.6 }} accessible accessibilityLabel={`${done ? t('health.timeline.reached') : isNext ? t('health.timeline.upcoming') : ''}. ${milestoneLabel(m, t)}: ${t(`health.milestones.${m.key}.title`)}`}>
              <Ionicons name={done ? 'checkmark-circle' : isNext ? 'time-outline' : 'ellipse-outline'} size={20} color={done ? theme.colors.success : isNext ? theme.colors.warm : theme.colors.textSecondary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodySmall" weight="semibold">
                  {milestoneLabel(m, t)} · {t(`health.milestones.${m.key}.title`)}
                </AppText>
                {!compact || isNext ? (
                  <AppText variant="caption" tone="secondary">
                    {t(`health.milestones.${m.key}.description`)}
                    {m.variesByPerson ? ` ${t('health.timeline.varies')}` : ''}
                  </AppText>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      {compact ? (
        <AppText variant="caption" tone="secondary" style={{ marginTop: 10 }}>
          {t('health.timeline.seeAll')}
        </AppText>
      ) : null}
    </AppCard>
  );
}
