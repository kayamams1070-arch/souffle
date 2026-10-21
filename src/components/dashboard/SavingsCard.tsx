import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppCard, AppText, ProgressBar } from '@/components/ui';
import { formatCents } from '@/utils/money';
import type { Language, User } from '@/types';

interface Props {
  savedCents: number;
  avoided: number;
  oneYear: number;
  fiveYears: number;
  tenYears: number;
  language: Language;
  project?: User['savingsProject'];
  /** Reduction goal: projections are based on the target, not on full abstinence. */
  reduction?: boolean;
  onPress?: () => void;
}

export function SavingsCard({ savedCents, avoided, oneYear, fiveYears, tenYears, language, project, reduction, onPress }: Props) {
  const { t } = useTranslation();
  return (
    <AppCard tone="accent" onPress={onPress} accessibilityLabel={t('dashboard.savings.a11y', { amount: formatCents(savedCents, language, 2), count: avoided })}>
      <AppText variant="bodySmall" tone="accent" weight="medium">
        {t('dashboard.savings.title')}
      </AppText>
      <AppText variant="display" weight="bold" tone="accent">
        {formatCents(savedCents, language, 2)}
      </AppText>
      <AppText variant="bodySmall" tone="accent">
        {t('dashboard.savings.avoided', { count: avoided })}
      </AppText>
      {project ? (
        <View style={{ marginTop: 10, gap: 6 }}>
          <AppText variant="bodySmall" weight="semibold" tone="accent">
            {t('dashboard.savings.project', { title: project.title })}
          </AppText>
          {project.targetCents ? (
            <ProgressBar value={savedCents / project.targetCents} tone="accent" accessibilityValueText={`${formatCents(savedCents, language)} / ${formatCents(project.targetCents, language)}`} />
          ) : null}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        {[
          [t('dashboard.savings.y1'), oneYear],
          [t('dashboard.savings.y5'), fiveYears],
          [t('dashboard.savings.y10'), tenYears],
        ].map(([label, value]) => (
          <View key={String(label)} style={{ alignItems: 'center' }}>
            <AppText variant="caption" tone="accent">
              {label}
            </AppText>
            <AppText weight="semibold" tone="accent">
              {formatCents(Number(value), language)}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" tone="accent" style={{ marginTop: 8 }}>
        {reduction ? t('dashboard.savings.disclaimerReduction') : t('dashboard.savings.disclaimer')}
      </AppText>
    </AppCard>
  );
}
