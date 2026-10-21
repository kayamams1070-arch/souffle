import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppButton, AppCard, AppText, Banner, ChipGroup, Screen, ScreenHeader, StatCard } from '@/components/ui';
import { useCravingStore, useJournalStore, useSettingsStore, useUserStore, useWorkoutStore } from '@/store';
import { buildReport, renderReportHtml, reportPeriod, type ReportPeriodKind } from '@/services/reportService';
import { exportPdf } from '@/services/exportService';
import { formatCents, formatDate } from '@/utils/money';
import { useNow } from '@/hooks/useNow';

export default function ReportsScreen() {
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const cravings = useCravingStore((s) => s.cravings);
  const smokingEvents = useCravingStore((s) => s.smokingEvents);
  const sessions = useWorkoutStore((s) => s.sessions);
  const entries = useJournalStore((s) => s.entries);
  const sleep = useJournalStore((s) => s.sleep);
  const cough = useJournalStore((s) => s.cough);
  const language = useSettingsStore((s) => s.settings.language);
  const now = useNow(60_000);
  const [kind, setKind] = useState<ReportPeriodKind>('current_month');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const report = useMemo(
    () => (user ? buildReport({ user, cravings, smokingEvents, sessions, entries, sleep, cough }, reportPeriod(kind, now)) : null),
    [user, cravings, smokingEvents, sessions, entries, sleep, cough, kind, now]
  );
  if (!user || !report) return null;

  const generate = async () => {
    setBusy(true);
    setStatus(null);
    const html = renderReportHtml(report, t, language);
    const r = await exportPdf(html, `souffle-rapport-${report.period.from.slice(0, 7)}.pdf`);
    setBusy(false);
    setStatus(r.ok ? { ok: true, text: t('reports.done') } : { ok: false, text: t(`privacy.errors.${r.error}`) });
  };

  return (
    <Screen footer={<AppButton label={t('reports.generate')} icon="document-text-outline" onPress={() => void generate()} loading={busy} />}>
      <ScreenHeader title={t('reports.title')} subtitle={t('reports.subtitle')} />
      <ChipGroup<ReportPeriodKind>
        options={[
          { value: 'current_month', label: t('reports.periods.current_month') },
          { value: 'previous_month', label: t('reports.periods.previous_month') },
          { value: 'last_30_days', label: t('reports.periods.last_30_days') },
        ]}
        value={kind}
        onChange={setKind}
        compact
      />
      <AppText tone="secondary">
        {formatDate(report.period.from, language)} – {formatDate(new Date(new Date(report.period.to).getTime() - 1).toISOString(), language)}
      </AppText>
      {report.isEmpty ? <Banner text={t('reports.empty')} /> : null}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {report.smokeFreeDays !== null ? (
          <StatCard label={t('reports.pdf.smokeFreeDays')} value={`${report.smokeFreeDays}/${report.daysInPeriod}`} icon="sunny-outline" tone="accent" />
        ) : (
          <StatCard label={t('reports.pdf.daysUnderTarget')} value={`${report.daysUnderTarget ?? 0}/${report.daysInPeriod}`} icon="trending-down-outline" tone="accent" />
        )}
        <StatCard label={t('reports.pdf.saved')} value={formatCents(report.savedCents, language)} icon="wallet-outline" tone="accent" />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatCard label={t('reports.pdf.workouts')} value={String(report.workoutsCompleted)} hint={t('reports.minutes', { count: report.workoutMinutes })} icon="fitness-outline" />
        <StatCard label={t('reports.pdf.cravingsCount')} value={String(report.cravings.count)} hint={t('reports.overcome', { count: report.cravings.overcome })} icon="cloud-outline" />
      </View>
      <AppCard title={t('reports.contentTitle')}>
        <AppText variant="bodySmall">{t('reports.content')}</AppText>
      </AppCard>
      {status ? <Banner text={status.text} tone={status.ok ? 'success' : 'danger'} /> : null}
      <AppText variant="caption" tone="secondary">
        {t('reports.pdf.disclaimer')}
      </AppText>
    </Screen>
  );
}
