import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppButton, AppCard, AppText, Banner, Screen, ScreenHeader, SwitchRow } from '@/components/ui';
import { useCravingStore, useJournalStore, useSettingsStore, useUserStore, useWorkoutStore } from '@/store';
import { computeSavings } from '@/utils/calculations';
import { totalSmokeFreeDays } from '@/utils/streaks';
import { cravingsOvercome } from '@/services/rewardService';
import { shareText } from '@/services/exportService';
import { localSocial } from '@/services/future';
import { formatCents } from '@/utils/money';
import { useNow } from '@/hooks/useNow';
import { useAppTheme } from '@/theme/ThemeContext';

type ShareKey = 'days' | 'savings' | 'workouts' | 'cravings' | 'why';

export default function FamilyScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const events = useCravingStore((s) => s.smokingEvents);
  const cravings = useCravingStore((s) => s.cravings);
  const sessions = useWorkoutStore((s) => s.sessions);
  const victories = useJournalStore((s) => s.entries.filter((e) => e.type !== 'free').length);
  const language = useSettingsStore((s) => s.settings.language);
  const now = useNow(60_000);
  const [selected, setSelected] = useState<Record<ShareKey, boolean>>({ days: true, savings: false, workouts: true, cravings: true, why: false });
  const [status, setStatus] = useState<string | null>(null);
  const remote = localSocial.availability();

  const summary = useMemo(() => {
    if (!user) return '';
    const lines: string[] = [user.firstName ? t('family.summary.header', { name: user.firstName }) : t('family.summary.headerAnonymous')];
    if (selected.days && user.goal === 'quit') lines.push(t('family.summary.days', { count: totalSmokeFreeDays(user, events, now) }));
    if (selected.savings) lines.push(t('family.summary.savings', { amount: formatCents(computeSavings(user, events, now).savedCents, language) }));
    if (selected.workouts) lines.push(t('family.summary.workouts', { count: sessions.filter((s) => s.completed).length }));
    if (selected.cravings) lines.push(t('family.summary.cravings', { count: cravingsOvercome(cravings), victories }));
    if (selected.why && user.why) lines.push(t('family.summary.why', { why: user.why }));
    lines.push('', t('family.summary.footer'));
    return lines.join('\n');
  }, [user, selected, events, now, sessions, cravings, victories, language, t]);

  if (!user) return null;

  const share = async () => {
    const r = await shareText(summary, 'souffle-recap.txt');
    setStatus(r.ok ? t('family.shared') : t(`privacy.errors.${r.error}`));
  };

  return (
    <Screen>
      <ScreenHeader title={t('family.title')} subtitle={t('family.subtitle')} />
      <AppCard title={t('family.visionTitle')}>
        <AppText variant="bodySmall">{t('family.vision')}</AppText>
      </AppCard>
      {!remote.available ? <Banner text={t('family.notAvailable')} tone="warm" icon="cloud-offline-outline" /> : null}
      <AppCard title={t('family.shareTitle')} subtitle={t('family.shareSubtitle')}>
        {(['days', 'savings', 'workouts', 'cravings', 'why'] as ShareKey[])
          .filter((k) => k !== 'days' || user.goal === 'quit')
          .map((k) => (
            <SwitchRow key={k} label={t(`family.share.${k}`)} value={selected[k]} onChange={(v) => setSelected((s) => ({ ...s, [k]: v }))} />
          ))}
        <View style={{ marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.border }} accessible accessibilityLabel={summary}>
          <AppText variant="bodySmall">{summary}</AppText>
        </View>
        <AppButton label={t('family.shareButton')} icon="share-outline" style={{ marginTop: 12 }} onPress={() => void share()} />
        <AppText variant="caption" tone="secondary" style={{ marginTop: 8 }}>
          {t('family.privacy')}
        </AppText>
      </AppCard>
      {status ? <Banner text={status} tone="success" /> : null}
    </Screen>
  );
}
