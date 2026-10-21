import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppButton, AppCard, AppText, Banner, ChipGroup, ConfirmDialog, ListRow, NumberStepper, Screen, ScreenHeader, StatCard } from '@/components/ui';
import { useCravingStore, useRewardStore, useSettingsStore, useUserStore } from '@/store';
import { useStreak } from '@/hooks/useRewards';
import { canStartFreeze, FREEZE_MAX_DAYS, SHIELD_COOLDOWN_DAYS, smokedOnDay, isDayShielded, isDayFrozen, firstCountableDay } from '@/utils/streaks';
import { addDaysToKey, dayKey } from '@/utils/dates';
import { formatDate } from '@/utils/money';
import type { StreakFreeze } from '@/types';

export default function StreakScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const events = useCravingStore((s) => s.smokingEvents);
  const rewards = useRewardStore();
  const language = useSettingsStore((s) => s.settings.language);
  const streak = useStreak();
  const [freezeDays, setFreezeDays] = useState(3);
  const [reason, setReason] = useState<StreakFreeze['reason']>('illness');
  const [confirmFreeze, setConfirmFreeze] = useState(false);
  const today = dayKey();
  const freezeCheck = useMemo(() => canStartFreeze(rewards.freezes, today, freezeDays), [rewards.freezes, today, freezeDays]);

  // Last 14 days calendar
  const days = useMemo(() => {
    const first = user ? firstCountableDay(user) : null;
    return Array.from({ length: 14 }, (_, i) => {
      const day = addDaysToKey(today, -(13 - i));
      const counted = first ? day >= first : false;
      return {
        day,
        counted,
        smoked: smokedOnDay(day, events),
        shielded: isDayShielded(day, rewards.shieldUses),
        frozen: isDayFrozen(day, rewards.freezes),
        isToday: day === today,
      };
    });
  }, [today, events, rewards.shieldUses, rewards.freezes, user]);

  const startFreeze = () => {
    rewards.addFreeze({ startDay: today, endDay: addDaysToKey(today, freezeDays - 1), reason });
    setConfirmFreeze(false);
  };

  return (
    <Screen>
      <ScreenHeader title={t('streak.title')} subtitle={t('streak.subtitle')} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatCard label={t('dashboard.streak')} value={t('units.daysCount', { count: streak.currentDays })} icon="flame-outline" tone="primary" />
        <StatCard label={t('streak.best')} value={t('units.daysCount', { count: streak.bestDays })} icon="trophy-outline" tone="warm" />
      </View>
      <AppCard title={t('streak.calendar')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {days.map((d) => {
            const bg = !d.counted ? theme.colors.surfaceAlt : d.frozen ? theme.colors.primarySoft : d.smoked && !d.shielded ? theme.colors.dangerSoft : d.smoked && d.shielded ? theme.colors.warmSoft : d.isToday ? theme.colors.surfaceAlt : theme.colors.accentSoft;
            const label = !d.counted ? '·' : d.frozen ? '❄' : d.smoked && !d.shielded ? '✕' : d.smoked && d.shielded ? '🛡' : d.isToday ? '…' : '✓';
            return (
              <View key={d.day} accessible accessibilityLabel={`${formatDate(d.day, language)}: ${!d.counted ? t('streak.legend.notCounted') : d.frozen ? t('streak.legend.frozen') : d.smoked && !d.shielded ? t('streak.legend.smoked') : d.smoked ? t('streak.legend.shielded') : d.isToday ? t('streak.legend.today') : t('streak.legend.smokeFree')}`} style={{ width: 40, height: 48, borderRadius: 8, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: d.isToday ? 2 : 0, borderColor: theme.colors.primary }}>
                <AppText variant="caption" tone="secondary">
                  {d.day.slice(8)}
                </AppText>
                <AppText variant="bodySmall">{label}</AppText>
              </View>
            );
          })}
        </View>
        <AppText variant="caption" tone="secondary" style={{ marginTop: 10 }}>
          ✓ {t('streak.legend.smokeFree')} · ✕ {t('streak.legend.smoked')} · 🛡 {t('streak.legend.shielded')} · ❄ {t('streak.legend.frozen')} · … {t('streak.legend.today')}
        </AppText>
        <AppText variant="caption" tone="secondary" style={{ marginTop: 4 }}>
          {t('streak.rule')}
        </AppText>
      </AppCard>

      <AppCard title={t('streak.shield.title')} subtitle={streak.shieldAvailable ? t('streak.shield.available') : t('streak.shield.unavailable', { date: streak.nextShieldAvailableAt ? formatDate(streak.nextShieldAvailableAt, language) : '' })}>
        <AppText variant="bodySmall" tone="secondary">
          {t('streak.shield.explain', { days: SHIELD_COOLDOWN_DAYS })}
        </AppText>
        {rewards.shieldUses.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            {rewards.shieldUses.slice(-5).reverse().map((s) => (
              <ListRow key={s.id} icon="shield-half-outline" title={t('streak.shield.usedOn', { date: formatDate(s.protectedDay, language) })} subtitle={formatDate(s.usedAt, language, true)} chevron={false} />
            ))}
          </View>
        ) : null}
      </AppCard>

      <AppCard title={t('streak.freeze.title')} subtitle={t('streak.freeze.subtitle', { max: FREEZE_MAX_DAYS })}>
        {streak.frozen ? (
          <Banner text={t('streak.freeze.active', { date: streak.freezeEndDay ? formatDate(streak.freezeEndDay, language) : '' })} />
        ) : (
          <View style={{ gap: 12 }}>
            <NumberStepper label={t('streak.freeze.days')} value={freezeDays} onChange={setFreezeDays} min={1} max={FREEZE_MAX_DAYS} unit={t('units.days')} />
            <ChipGroup
              options={[
                { value: 'illness', label: t('streak.freeze.reasons.illness') },
                { value: 'travel', label: t('streak.freeze.reasons.travel') },
                { value: 'other', label: t('streak.freeze.reasons.other') },
              ]}
              value={reason}
              onChange={setReason}
              compact
            />
            <AppButton label={t('streak.freeze.start')} variant="secondary" icon="snow-outline" disabled={!freezeCheck.ok} onPress={() => setConfirmFreeze(true)} />
            {!freezeCheck.ok ? (
              <AppText variant="caption" tone="secondary">
                {t(`streak.freeze.errors.${freezeCheck.reason ?? 'active'}`)}
              </AppText>
            ) : null}
          </View>
        )}
        {rewards.freezes.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            {rewards.freezes.slice(-5).reverse().map((f) => (
              <ListRow key={f.id} icon="snow-outline" title={`${formatDate(f.startDay, language)} → ${formatDate(f.endDay, language)}`} subtitle={t(`streak.freeze.reasons.${f.reason}`)} chevron={false} right={f.endDay >= today ? <AppButton label={t('common.cancel')} variant="ghost" size="sm" fullWidth={false} onPress={() => rewards.cancelFreeze(f.id)} /> : undefined} />
            ))}
          </View>
        ) : null}
      </AppCard>
      <ConfirmDialog visible={confirmFreeze} title={t('streak.freeze.confirmTitle')} message={t('streak.freeze.confirmMessage', { count: freezeDays })} confirmLabel={t('common.confirm')} cancelLabel={t('common.cancel')} onConfirm={startFreeze} onCancel={() => setConfirmFreeze(false)} />
    </Screen>
  );
}
