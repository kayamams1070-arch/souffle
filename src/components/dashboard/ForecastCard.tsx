import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppCard, AppText } from '@/components/ui';
import type { CravingForecast } from '@/services/cravingPredictionService';
import { FORECAST_MIN_CRAVINGS } from '@/utils/constants';

export function forecastSentences(f: CravingForecast, t: (k: string, o?: Record<string, unknown>) => string): string[] {
  const out: string[] = [];
  if (f.peakSlot) out.push(t('forecast.peakSlot', { slot: t(`forecast.slots.${f.peakSlot.slot}`), percent: Math.round(f.peakSlot.share * 100) }));
  if (f.peakWeekday) out.push(t('forecast.peakWeekday', { day: t(`weekdays.${f.peakWeekday.weekday}`), percent: Math.round(f.peakWeekday.share * 100) }));
  if (f.topTrigger) out.push(t('forecast.topTrigger', { trigger: t(`triggers.${f.topTrigger.trigger}`), percent: Math.round(f.topTrigger.share * 100) }));
  if (f.bestIntervention) out.push(t('forecast.bestIntervention', { intervention: t(`interventions.${f.bestIntervention.intervention}`), percent: Math.round(f.bestIntervention.successRate * 100), count: f.bestIntervention.count }));
  return out;
}

export function ForecastCard({ forecast, onPress }: { forecast: CravingForecast; onPress?: () => void }) {
  const { t } = useTranslation();
  if (!forecast.enough) {
    return (
      <AppCard title={t('forecast.title')} onPress={onPress} tone="alt">
        <AppText variant="bodySmall" tone="secondary">
          {t('forecast.notEnough', { count: forecast.observations, min: FORECAST_MIN_CRAVINGS })}
        </AppText>
      </AppCard>
    );
  }
  const sentences = forecastSentences(forecast, t);
  return (
    <AppCard title={t('forecast.title')} subtitle={t(`forecast.confidence.${forecast.confidence}`, { count: forecast.observations })} onPress={onPress} tone={forecast.nowInPeak ? 'warm' : 'default'}>
      {forecast.nowInPeak ? (
        <AppText weight="semibold" tone="warm" style={{ marginBottom: 6 }}>
          {t('forecast.nowInPeak')}
        </AppText>
      ) : null}
      {sentences.length === 0 ? (
        <AppText variant="bodySmall" tone="secondary">
          {t('forecast.noPattern')}
        </AppText>
      ) : (
        sentences.map((s) => (
          <AppText key={s} variant="bodySmall" style={{ marginBottom: 4 }}>
            • {s}
          </AppText>
        ))
      )}
      <AppText variant="caption" tone="secondary" style={{ marginTop: 6 }}>
        {t('forecast.disclaimer')}
      </AppText>
    </AppCard>
  );
}
