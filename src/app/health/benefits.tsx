import React, { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppButton, AppCard, AppText, Banner, ChipGroup, ProgressBar, Screen, ScreenHeader, StatCard, TextField } from '@/components/ui';
import { HealthTimeline } from '@/components/dashboard/HealthTimeline';
import { useCravingStore, useSettingsStore, useUserStore, useWorkoutStore } from '@/store';
import { useNow } from '@/hooks/useNow';
import { computeSavings, getSmokeFreeState } from '@/utils/calculations';
import { totalSmokeFreeDays } from '@/utils/streaks';
import { milestoneStatus } from '@/data/healthMilestones';
import { computeWorkoutStats } from '@/services/analyticsService';
import { cravingsOvercome } from '@/services/rewardService';
import { formatCents, parseEurosToCents } from '@/utils/money';
import { HEALTH_SOURCES } from '@/utils/constants';

const PROJECT_KINDS = ['travel', 'purchase', 'hobby', 'savings', 'other'] as const;

export default function BenefitsScreen() {
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const setSavingsProject = useUserStore((s) => s.setSavingsProject);
  const events = useCravingStore((s) => s.smokingEvents);
  const cravings = useCravingStore((s) => s.cravings);
  const sessions = useWorkoutStore((s) => s.sessions);
  const language = useSettingsStore((s) => s.settings.language);
  const now = useNow(60_000);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(user?.savingsProject?.title ?? '');
  const [target, setTarget] = useState(user?.savingsProject?.targetCents ? String(user.savingsProject.targetCents / 100) : '');
  const [kind, setKind] = useState<(typeof PROJECT_KINDS)[number] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const savings = useMemo(() => (user ? computeSavings(user, events, now) : null), [user, events, now]);
  const smokeFree = useMemo(() => (user ? getSmokeFreeState(user, events, now) : null), [user, events, now]);
  const workoutStats = useMemo(() => computeWorkoutStats(sessions, now), [sessions, now]);
  const days = useMemo(() => (user ? totalSmokeFreeDays(user, events, now) : 0), [user, events, now]);
  if (!user || !savings) return null;
  const elapsedMinutes = smokeFree?.status === 'running' ? smokeFree.duration.totalMs / 60_000 : 0;
  const milestones = milestoneStatus(elapsedMinutes, user?.smoking.substance ?? 'tobacco');

  const saveProject = () => {
    const name = title.trim() || (kind ? t(`benefits.kinds.${kind}`) : '');
    if (!name) {
      setError(t('benefits.projectNameRequired'));
      return;
    }
    const cents = target.trim() ? parseEurosToCents(target) : undefined;
    if (cents === null) {
      setError(t('benefits.projectTargetInvalid'));
      return;
    }
    setSavingsProject({ title: name, targetCents: cents });
    setError(null);
    setEditing(false);
  };

  return (
    <Screen>
      <ScreenHeader title={t('benefits.title')} subtitle={t('benefits.subtitle')} />
      <AppCard tone="accent" title={t('benefits.savedTitle')}>
        <AppText variant="display" tone="accent" weight="bold">
          {formatCents(savings.savedCents, language, 2)}
        </AppText>
        <AppText variant="bodySmall" tone="accent">
          {t('dashboard.savings.avoided', { count: savings.cigarettesAvoided })}
        </AppText>
        {savings.spentSincePlanCents > 0 ? (
          <AppText variant="caption" tone="accent" style={{ marginTop: 4 }}>
            {t('benefits.spentLogged', { amount: formatCents(savings.spentSincePlanCents, language, 2) })}
          </AppText>
        ) : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
          {(
            [
              ['y1', savings.projectionOneYearCents],
              ['y5', savings.projectionFiveYearsCents],
              ['y10', savings.projectionTenYearsCents],
            ] as const
          ).map(([k, v]) => (
            <View key={k} style={{ alignItems: 'center' }}>
              <AppText variant="caption" tone="accent">
                {t(`dashboard.savings.${k}`)}
              </AppText>
              <AppText weight="semibold" tone="accent">
                {formatCents(v, language)}
              </AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" tone="accent" style={{ marginTop: 8 }}>
          {user.goal === 'reduce' ? t('dashboard.savings.disclaimerReduction') : t('dashboard.savings.disclaimer')}
        </AppText>
      </AppCard>

      <AppCard title={t('benefits.projectTitle')} subtitle={t('benefits.projectSubtitle')}>
        {!editing && user.savingsProject ? (
          <View style={{ gap: 8 }}>
            <AppText weight="semibold">{user.savingsProject.title}</AppText>
            {user.savingsProject.targetCents ? (
              <>
                <ProgressBar value={savings.savedCents / user.savingsProject.targetCents} tone="accent" label={t('benefits.projectProgress', { saved: formatCents(savings.savedCents, language), target: formatCents(user.savingsProject.targetCents, language) })} />
                {savings.savedCents >= user.savingsProject.targetCents ? <Banner text={t('benefits.projectReached')} tone="success" icon="gift-outline" /> : null}
              </>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <AppButton label={t('common.edit')} variant="secondary" size="sm" fullWidth={false} onPress={() => setEditing(true)} />
              <AppButton label={t('common.delete')} variant="ghost" size="sm" fullWidth={false} onPress={() => { setSavingsProject(undefined); setTitle(''); setTarget(''); }} />
            </View>
          </View>
        ) : editing || !user.savingsProject ? (
          <View style={{ gap: 12 }}>
            <ChipGroup options={PROJECT_KINDS.map((k) => ({ value: k, label: t(`benefits.kinds.${k}`) }))} value={kind} onChange={(k) => { setKind(k); if (!title.trim()) setTitle(t(`benefits.kinds.${k}`)); }} compact />
            <TextField label={t('benefits.projectName')} value={title} onChangeText={setTitle} maxLength={80} />
            <TextField label={t('benefits.projectTarget')} value={target} onChangeText={setTarget} keyboardType="decimal-pad" suffix="€" maxLength={8} hint={t('benefits.projectTargetHint')} />
            {error ? <Banner text={error} tone="danger" /> : null}
            <AppButton label={t('common.save')} icon="checkmark" onPress={saveProject} />
            {editing ? <AppButton label={t('common.cancel')} variant="ghost" onPress={() => setEditing(false)} /> : null}
          </View>
        ) : null}
        <AppText variant="caption" tone="secondary" style={{ marginTop: 8 }}>
          {t('benefits.projectNote')}
        </AppText>
      </AppCard>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatCard label={t('progress.smokeFreeDays')} value={user.goal === 'quit' ? String(days) : '–'} hint={user.goal === 'quit' ? t('progress.smokeFreeDaysHint') : t('benefits.notForReduction')} icon="sunny-outline" tone="accent" />
        <StatCard label={t('craving.stats.overcome')} value={String(cravingsOvercome(cravings))} icon="hand-left-outline" />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatCard label={t('sport.stats.completed')} value={String(workoutStats.completed)} icon="fitness-outline" />
        <StatCard label={t('sport.stats.minutes')} value={String(workoutStats.totalMinutes)} icon="time-outline" />
      </View>

      {user.goal === 'quit' && smokeFree?.status === 'running' ? (
        <HealthTimeline elapsedMinutes={elapsedMinutes} reached={milestones.reached} next={milestones.next} substance={user?.smoking.substance ?? 'tobacco'} />
      ) : (
        <AppCard title={t('health.timeline.title')}>
          <AppText variant="bodySmall" tone="secondary">
            {user.goal === 'reduce' ? t('benefits.timelineReduction') : t('benefits.timelineFuture')}
          </AppText>
        </AppCard>
      )}

      <AppCard title={t('benefits.limitsTitle')} tone="alt">
        <AppText variant="bodySmall">{t('benefits.limits')}</AppText>
        <View style={{ marginTop: 8, gap: 4 }}>
          {Object.entries(HEALTH_SOURCES).map(([id, s]) => (
            <AppButton key={id} label={s.label} variant="ghost" size="sm" icon="link-outline" onPress={() => void Linking.openURL(s.url).catch(() => undefined)} />
          ))}
        </View>
      </AppCard>
    </Screen>
  );
}
