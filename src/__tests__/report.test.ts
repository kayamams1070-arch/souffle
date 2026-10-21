import { buildReport, renderReportHtml, reportPeriod } from '@/services/reportService';
import { craving, local, makeUser, ms, session, smoke } from './helpers';

const t = (key: string, opts?: Record<string, unknown>) =>
  opts ? `${key} ${JSON.stringify(opts)}` : key;

describe('report periods', () => {
  const now = ms(local(2026, 4, 15, 12));
  it('covers the current month up to now', () => {
    const p = reportPeriod('current_month', now);
    expect(p.from).toBe(local(2026, 4, 1, 0));
    expect(p.to).toBe(new Date(now).toISOString());
  });
  it('covers the whole previous month', () => {
    const p = reportPeriod('previous_month', now);
    expect(p.from).toBe(local(2026, 3, 1, 0));
    expect(p.to).toBe(local(2026, 4, 1, 0));
  });
});

describe('buildReport', () => {
  const quit = local(2026, 3, 1, 8);
  const user = makeUser({ quitDate: quit, savingsStartDate: quit });
  const period = reportPeriod('previous_month', ms(local(2026, 4, 15, 12)));

  it('aggregates the month from real entries', () => {
    const report = buildReport(
      {
        user,
        cravings: [
          craving(local(2026, 3, 3, 9), { intensity: 8, outcome: 'passed' }),
          craving(local(2026, 3, 25, 9), { intensity: 4, trigger: 'stress' }),
        ],
        smokingEvents: [smoke(local(2026, 3, 10, 20), 2)],
        sessions: [
          session(local(2026, 3, 5, 18)),
          session(local(2026, 3, 6, 18), { completed: false }),
          session(local(2026, 2, 20, 18)),
        ],
        entries: [
          { id: 'v', date: local(2026, 3, 12, 20), type: 'good_day', text: 'Belle journée' },
          { id: 'f', date: local(2026, 3, 12, 21), type: 'free', text: 'note libre' },
        ],
        sleep: [{ id: 's', day: '2026-03-04', durationMinutes: 420, quality: 4 }],
        cough: [],
      },
      period
    );
    expect(report.daysInPeriod).toBe(31);
    // 2..31 March complete days = 30, minus 10 March = 29
    expect(report.smokeFreeDays).toBe(29);
    expect(report.cigarettesLogged).toBe(2);
    expect(report.workoutsCompleted).toBe(1);
    expect(report.workoutMinutes).toBe(10);
    expect(report.cravings).toMatchObject({
      count: 2,
      overcome: 1,
      averageIntensity: 6,
      firstHalfIntensity: 8,
      secondHalfIntensity: 4,
    });
    expect(report.victories.map((v) => v.text)).toEqual(['Belle journée']);
    expect(report.sleep).toMatchObject({ entries: 1, averageMinutes: 420, averageQuality: 4 });
    expect(report.cough).toBeNull();
    // March 1 08:00 -> April 1 00:00 is 30 days 16 h (minus 1 h for DST) of 20 cig/day, minus 2 smoked.
    expect(report.cigarettesAvoided).toBeGreaterThan(600);
    expect(report.savedCents).toBeGreaterThan(30_000);
    expect(report.isEmpty).toBe(false);
  });

  it('handles a period without data', () => {
    const fresh = makeUser({
      goal: 'reduce',
      quitDate: undefined,
      createdAt: local(2026, 4, 10),
      reductionStartDate: local(2026, 4, 10),
      savingsStartDate: local(2026, 4, 10),
    });
    const report = buildReport(
      {
        user: fresh,
        cravings: [],
        smokingEvents: [],
        sessions: [],
        entries: [],
        sleep: [],
        cough: [],
      },
      period
    );
    expect(report.isEmpty).toBe(true);
    expect(report.smokeFreeDays).toBeNull();
    const html = renderReportHtml(report, t, 'fr');
    expect(html).toContain('reports.pdf.empty');
  });

  it('renders a self-contained HTML document with the medical disclaimer and escaped user text', () => {
    const report = buildReport(
      {
        user,
        cravings: [],
        smokingEvents: [],
        sessions: [],
        entries: [
          {
            id: 'x',
            date: local(2026, 3, 2, 9),
            type: 'decision',
            text: '<script>alert(1)</script>',
          },
        ],
        sleep: [],
        cough: [],
      },
      period
    );
    const html = renderReportHtml(report, t, 'fr');
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('reports.pdf.disclaimer');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toMatch(/https?:\/\//);
  });
});
