import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppButton, AppCard, AppText, ProgressBar } from '@/components/ui';
import type { Substance } from '@/types';
import { WITHDRAWAL_COMPANION_DAYS, type WithdrawalPhase } from '@/utils/withdrawal';

interface Props {
  phase: WithdrawalPhase;
  substance: Substance;
  onNights: () => void;
  onBreathe: () => void;
}

/** Day-by-day card for the first 30 days without cannabis: what is common now and what helps. */
export function WithdrawalCompanion({ phase, substance, onNights, onBreathe }: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const id = phase.id;
  const tips = [t(`withdrawal.phases.${id}.tip1`), t(`withdrawal.phases.${id}.tip2`), t(`withdrawal.phases.${id}.tip3`)];
  return (
    <AppCard title={t('withdrawal.title', { day: phase.day })} subtitle={t(`withdrawal.phases.${id}.title`)} tone="accent" testID="withdrawal-companion">
      <View style={{ gap: 10 }}>
        <ProgressBar
          value={phase.day / WITHDRAWAL_COMPANION_DAYS}
          tone="accent"
          label={t('withdrawal.progress', { day: phase.day, total: WITHDRAWAL_COMPANION_DAYS })}
          accessibilityValueText={t('withdrawal.progress', { day: phase.day, total: WITHDRAWAL_COMPANION_DAYS })}
        />
        <AppText variant="bodySmall">{t(`withdrawal.phases.${id}.text`)}</AppText>
        <AppText variant="bodySmall" weight="semibold">
          {t('withdrawal.whatHelps')}
        </AppText>
        {tips.map((tip) => (
          <View key={tip} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.success} style={{ marginTop: 1 }} />
            <AppText variant="bodySmall" style={{ flex: 1 }}>
              {tip}
            </AppText>
          </View>
        ))}
        {substance === 'both' ? (
          <AppText variant="caption" tone="secondary">
            {t('withdrawal.nicotineNote')}
          </AppText>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <AppButton label={t('withdrawal.nights')} icon="moon-outline" variant="secondary" size="sm" fullWidth={false} onPress={onNights} />
          <AppButton label={t('withdrawal.breathe')} icon="leaf-outline" variant="ghost" size="sm" fullWidth={false} onPress={onBreathe} />
        </View>
        <AppText variant="caption" tone="secondary">
          {t('withdrawal.disclaimer')}
        </AppText>
      </View>
    </AppCard>
  );
}
