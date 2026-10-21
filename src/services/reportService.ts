/**
 * Monthly report: pure aggregation over a period (unit tested) and HTML rendering for
 * the PDF generated on the device by expo-print. No data leaves the phone unless the
 * user explicitly shares the generated file.
 */
import type {
  CoughEntry,
  Craving,
  JournalEntry,
  Language,
  SleepEntry,
  SmokingEvent,
  Trigger,
  User,
  WorkoutSession,
} from '@/types';
import { computeSavings, savingsStart } from '@/utils/calculations';
import { dayKey, dayKeysBetween, DAY_MS } from '@/utils/dates';
import { firstFullDayAfter } from '@/utils/streaks';
import { formatCents, formatDate } from '@/utils/money';

export type ReportPeriodKind = 'current_month' | 'previous_month' | 'last_30_days';

export interface ReportPeriod {
  kind: ReportPeriodKind;
  /** Inclusive start (ISO) */
  from: string;
  /** Exclusive end (ISO), capped to "now" */
  to: string;
}

export function reportPeriod(kind: ReportPeriodKind, now = Date.now()): ReportPeriod {
  const d = new Date(now);
  if (kind === 'last_30_days') {
    return { kind, from: new Date(now - 30 * DAY_MS).toISOString(), to: new Date(now).toISOString() };
  }
  const monthOffset = kind === 'previous_month' ? -1 : 0;
  const start = new Date(d.getFullYear(), d.getMonth() + monthOffset, 1, 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + monthOffset + 1, 1, 0, 0, 0, 0);
  return { kind, from: start.toISOString(), to: new Date(Math.min(end.getTime(), now)).toISOString() };
}

export interface ReportData {
  period: ReportPeriod;
  goal: User['goal'];
  firstName: string;
  /** Quit goal: full smoke-free days inside the period (null for reduction). */
  smokeFreeDays: number | null;
  /** Reduction goal: days at or under the daily target inside the period (null for quit). */
  daysUnderTarget: number | null;
  daysInPeriod: number;
  cigarettesLogged: number;
  cigarettesAvoided: number;
  savedCents: number;
  workoutsCompleted: number;
  workoutMinutes: number;
  cravings: {
    count: number;
    overcome: number;
    averageIntensity: number | null;
    /** Average intensity in the first and second half of the period (trend). */
    firstHalfIntensity: number | null;
    secondHalfIntensity: number | null;
    topTriggers: { trigger: Trigger; count: number }[];
  };
  victories: { date: string; type: JournalEntry['type']; text: string }[];
  sleep: { entries: number; averageMinutes: number; averageQuality: number } | null;
  cough: { entries: number; averageIntensity: number; first: number; last: number } | null;
  isEmpty: boolean;
}

export interface ReportInput {
  user: User;
  cravings: Craving[];
  smokingEvents: SmokingEvent[];
  sessions: WorkoutSession[];
  entries: JournalEntry[];
  sleep: SleepEntry[];
  cough: CoughEntry[];
}

const within = (iso: string, from: number, to: number) => {
  const t = new Date(iso).getTime();
  return t >= from && t < to;
};

const avg = (values: number[]) => (values.length ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10 : null);

export function buildReport(input: ReportInput, period: ReportPeriod): ReportData {
  const from = new Date(period.from).getTime();
  const to = new Date(period.to).getTime();
  const { user } = input;
  const firstDay = dayKey(from);
  const lastDay = dayKey(to - 1);
  const days = to > from ? dayKeysBetween(firstDay, lastDay) : [];

  const eventsIn = input.smokingEvents.filter((e) => within(e.occurredAt, from, to));
  const smokedByDay = new Map<string, number>();
  for (const e of input.smokingEvents) {
    const k = dayKey(e.occurredAt);
    smokedByDay.set(k, (smokedByDay.get(k) ?? 0) + e.cigarettes);
  }

  // Savings inside the period = savings at the end minus savings at the start.
  const atEnd = computeSavings(user, input.smokingEvents, to);
  const atStart = computeSavings(user, input.smokingEvents, from);

  let smokeFreeDays: number | null = null;
  let daysUnderTarget: number | null = null;
  const today = dayKey(Date.now());
  if (user.goal === 'quit' && user.quitDate) {
    // Only complete days after the start of tracking, before today, count.
    const firstFull = firstFullDayAfter(savingsStart(user));
    smokeFreeDays = days.filter((d) => d >= firstFull && d < today && !(smokedByDay.get(d) ?? 0)).length;
  } else if (user.goal === 'reduce') {
    const target = user.reductionTargetPerDay ?? user.smokingBaselinePerDay;
    const planStart = dayKey(user.reductionStartDate ?? user.createdAt);
    daysUnderTarget = days.filter((d) => d >= planStart && (smokedByDay.get(d) ?? 0) <= target).length;
  }

  const sessionsIn = input.sessions.filter((s) => s.completed && within(s.completedAt ?? s.startedAt, from, to));
  const cravingsIn = input.cravings.filter((c) => within(c.occurredAt, from, to));
  const mid = from + (to - from) / 2;
  const triggerCounts = new Map<Trigger, number>();
  for (const c of cravingsIn) triggerCounts.set(c.trigger, (triggerCounts.get(c.trigger) ?? 0) + 1);

  const victories = input.entries
    .filter((e) => e.type !== 'free' && within(e.date, from, to))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((e) => ({ date: e.date, type: e.type, text: e.text }));

  const sleepIn = input.sleep.filter((s) => s.day >= firstDay && s.day <= lastDay);
  const coughIn = [...input.cough.filter((c) => c.day >= firstDay && c.day <= lastDay)].sort((a, b) => (a.day < b.day ? -1 : 1));

  const report: ReportData = {
    period,
    goal: user.goal,
    firstName: user.firstName,
    smokeFreeDays,
    daysUnderTarget,
    daysInPeriod: days.length,
    cigarettesLogged: eventsIn.reduce((s, e) => s + e.cigarettes, 0),
    cigarettesAvoided: Math.max(0, atEnd.cigarettesAvoided - atStart.cigarettesAvoided),
    savedCents: Math.max(0, atEnd.savedCents - atStart.savedCents),
    workoutsCompleted: sessionsIn.length,
    workoutMinutes: Math.round(sessionsIn.reduce((s, x) => s + x.durationSeconds, 0) / 60),
    cravings: {
      count: cravingsIn.length,
      overcome: cravingsIn.filter((c) => c.outcome === 'passed' || c.outcome === 'partly_passed').length,
      averageIntensity: avg(cravingsIn.map((c) => c.intensity)),
      firstHalfIntensity: avg(cravingsIn.filter((c) => new Date(c.occurredAt).getTime() < mid).map((c) => c.intensity)),
      secondHalfIntensity: avg(cravingsIn.filter((c) => new Date(c.occurredAt).getTime() >= mid).map((c) => c.intensity)),
      topTriggers: [...triggerCounts.entries()].map(([trigger, count]) => ({ trigger, count })).sort((a, b) => b.count - a.count).slice(0, 3),
    },
    victories,
    sleep: sleepIn.length
      ? {
          entries: sleepIn.length,
          averageMinutes: Math.round(sleepIn.reduce((s, e) => s + e.durationMinutes, 0) / sleepIn.length),
          averageQuality: avg(sleepIn.map((e) => e.quality)) ?? 0,
        }
      : null,
    cough: coughIn.length
      ? {
          entries: coughIn.length,
          averageIntensity: avg(coughIn.map((c) => c.intensity)) ?? 0,
          first: coughIn[0]!.intensity,
          last: coughIn[coughIn.length - 1]!.intensity,
        }
      : null,
    isEmpty: false,
  };
  report.isEmpty =
    report.cigarettesLogged === 0 &&
    report.workoutsCompleted === 0 &&
    report.cravings.count === 0 &&
    report.victories.length === 0 &&
    !report.sleep &&
    !report.cough &&
    report.savedCents === 0;
  return report;
}

type T = (key: string, options?: Record<string, unknown>) => string;

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Renders the report as a self-contained, printable HTML page (no external resources). */
export function renderReportHtml(report: ReportData, t: T, language: Language): string {
  const p = report.period;
  const periodLabel = `${formatDate(p.from, language)} – ${formatDate(new Date(new Date(p.to).getTime() - 1).toISOString(), language)}`;
  const row = (label: string, value: string) => `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`;
  const rows: string[] = [
    row(t('reports.pdf.goal'), report.goal === 'quit' ? t('goal.quit') : t('goal.reduce')),
  ];
  if (report.smokeFreeDays !== null) rows.push(row(t('reports.pdf.smokeFreeDays'), t('reports.pdf.daysOf', { count: report.smokeFreeDays, total: report.daysInPeriod })));
  if (report.daysUnderTarget !== null) rows.push(row(t('reports.pdf.daysUnderTarget'), t('reports.pdf.daysOf', { count: report.daysUnderTarget, total: report.daysInPeriod })));
  rows.push(row(t('reports.pdf.cigarettesLogged'), String(report.cigarettesLogged)));
  rows.push(row(t('reports.pdf.cigarettesAvoided'), String(report.cigarettesAvoided)));
  rows.push(row(t('reports.pdf.saved'), formatCents(report.savedCents, language, 2)));
  rows.push(row(t('reports.pdf.workouts'), String(report.workoutsCompleted)));
  rows.push(row(t('reports.pdf.workoutMinutes'), String(report.workoutMinutes)));

  const c = report.cravings;
  const cravingRows: string[] = [
    row(t('reports.pdf.cravingsCount'), String(c.count)),
    row(t('reports.pdf.cravingsOvercome'), String(c.overcome)),
  ];
  if (c.averageIntensity !== null) cravingRows.push(row(t('reports.pdf.avgIntensity'), `${c.averageIntensity}/10`));
  if (c.firstHalfIntensity !== null && c.secondHalfIntensity !== null) {
    cravingRows.push(row(t('reports.pdf.intensityTrend'), t('reports.pdf.intensityTrendValue', { first: c.firstHalfIntensity, second: c.secondHalfIntensity })));
  }
  if (c.topTriggers.length) {
    cravingRows.push(row(t('reports.pdf.topTriggers'), c.topTriggers.map((x) => `${t(`triggers.${x.trigger}`)} (${x.count})`).join(', ')));
  }

  const victories = report.victories.length
    ? `<ul>${report.victories
        .slice(0, 15)
        .map((v) => `<li><span class="muted">${esc(formatDate(v.date, language))} · ${esc(t(`journal.types.${v.type}`))}</span><br/>${esc(v.text)}</li>`)
        .join('')}</ul>`
    : `<p class="muted">${esc(t('reports.pdf.noVictories'))}</p>`;

  const health: string[] = [];
  if (report.sleep) {
    const h = Math.floor(report.sleep.averageMinutes / 60);
    const m = String(report.sleep.averageMinutes % 60).padStart(2, '0');
    health.push(row(t('reports.pdf.sleep'), t('reports.pdf.sleepValue', { duration: `${h}h${m}`, quality: report.sleep.averageQuality, count: report.sleep.entries })));
  }
  if (report.cough) {
    health.push(row(t('reports.pdf.cough'), t('reports.pdf.coughValue', { avg: report.cough.averageIntensity, first: report.cough.first, last: report.cough.last, count: report.cough.entries })));
  }

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(t('reports.pdf.title'))}</title>
<style>
  body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #24313D; margin: 32px; }
  h1 { color: #1E3A5F; font-size: 24px; margin: 0 0 4px; }
  h2 { color: #1E3A5F; font-size: 16px; margin: 24px 0 8px; border-bottom: 2px solid #7BA88F; padding-bottom: 4px; }
  .muted { color: #5A6673; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-weight: 600; width: 55%; padding: 6px 8px; background: #F5F2EC; }
  td { padding: 6px 8px; }
  tr + tr th, tr + tr td { border-top: 1px solid #E6E2D8; }
  ul { padding-left: 18px; margin: 0; }
  li { margin-bottom: 8px; font-size: 13px; }
  .note { margin-top: 28px; padding: 12px; background: #FBE4D3; border-radius: 8px; font-size: 12px; }
</style>
</head>
<body>
  <h1>${esc(t('reports.pdf.title'))}</h1>
  <div class="muted">${esc(periodLabel)}${report.firstName ? ` · ${esc(report.firstName)}` : ''}</div>
  ${report.isEmpty ? `<p>${esc(t('reports.pdf.empty'))}</p>` : ''}
  <h2>${esc(t('reports.pdf.summary'))}</h2>
  <table>${rows.join('')}</table>
  <p class="muted">${esc(t('reports.pdf.estimates'))}</p>
  <h2>${esc(t('reports.pdf.cravings'))}</h2>
  <table>${cravingRows.join('')}</table>
  <h2>${esc(t('reports.pdf.victories'))}</h2>
  ${victories}
  ${health.length ? `<h2>${esc(t('reports.pdf.health'))}</h2><table>${health.join('')}</table>` : ''}
  <div class="note">${esc(t('reports.pdf.disclaimer'))}</div>
  <p class="muted">${esc(t('reports.pdf.generated', { date: formatDate(new Date().toISOString(), language, true) }))}</p>
</body>
</html>`;
}
