import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppButton, AppCard, AppText, Banner, ChipGroup, ScaleSelector, Screen } from '@/components/ui';
import { useSosSession } from '@/store/useSosSession';
import { useCravingStore, useUserStore } from '@/store';
import { TRIGGERS, type InterventionType, type Trigger } from '@/types';
import { suggestionForTrigger } from '@/services/recommendationService';
import { computeForecast } from '@/services/cravingPredictionService';

export default function SosScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const cravings = useCravingStore((s) => s.cravings);
  const begin = useSosSession((s) => s.begin);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [showIntake, setShowIntake] = useState(false);
  const forecast = useMemo(() => computeForecast(cravings), [cravings]);

  const suggestion = useMemo(() => (trigger && user ? suggestionForTrigger(trigger, user) : null), [trigger, user]);

  const go = (intervention: InterventionType) => {
    begin({ intervention, intensity, trigger });
    switch (intervention) {
      case 'breathing':
        router.push('/sos/breathing');
        break;
      case 'workout':
        router.push('/sos/workout');
        break;
      case 'distraction':
        router.push('/sos/distraction');
        break;
      case 'craving_surf':
        router.push('/craving/surf');
        break;
      default:
        router.push('/sos/breathing');
    }
  };

  const options: { key: InterventionType; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; tone: 'primary' | 'accent' | 'warm' }[] = [
    { key: 'breathing', icon: 'cloud-outline', title: t('sos.options.breathing.title'), subtitle: t('sos.options.breathing.subtitle'), tone: 'primary' },
    { key: 'workout', icon: 'walk-outline', title: t('sos.options.workout.title'), subtitle: t('sos.options.workout.subtitle'), tone: 'accent' },
    { key: 'distraction', icon: 'game-controller-outline', title: t('sos.options.distraction.title'), subtitle: t('sos.options.distraction.subtitle'), tone: 'warm' },
  ];

  return (
    <Screen insideTabs>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.sos, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="hand-left" size={34} color={theme.colors.sosText} />
        </View>
        <AppText variant="h1" align="center">
          {t('sos.title')}
        </AppText>
        <AppText tone="secondary" align="center">
          {t('sos.subtitle')}
        </AppText>
      </View>

      {forecast.bestIntervention && forecast.bestIntervention.successRate >= 0.6 ? (
        <Banner text={t('sos.bestForYou', { intervention: t(`interventions.${forecast.bestIntervention.intervention}`), percent: Math.round(forecast.bestIntervention.successRate * 100) })} tone="success" icon="sparkles-outline" />
      ) : null}

      {options.map((o) => (
        <AppCard key={o.key} tone={o.tone} onPress={() => go(o.key)} accessibilityLabel={`${o.title}. ${o.subtitle}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Ionicons name={o.icon} size={30} color={theme.colors.text} />
            <View style={{ flex: 1 }}>
              <AppText variant="h3">{o.title}</AppText>
              <AppText variant="bodySmall" tone="secondary">
                {o.subtitle}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </View>
        </AppCard>
      ))}

      <AppButton label={t('sos.surf')} variant="secondary" icon="water-outline" onPress={() => go('craving_surf')} accessibilityHint={t('sos.surfHint')} />

      <AppCard tone="alt">
        <AppButton label={showIntake ? t('sos.intake.hide') : t('sos.intake.show')} variant="ghost" size="sm" onPress={() => setShowIntake((v) => !v)} />
        {showIntake ? (
          <View style={{ gap: 14, marginTop: 8 }}>
            <ScaleSelector label={t('craving.intensity')} value={intensity} onChange={setIntensity} min={1} max={10} minLabel={t('craving.intensityLow')} maxLabel={t('craving.intensityHigh')} />
            <ChipGroup label={t('craving.trigger')} options={TRIGGERS.map((tr) => ({ value: tr, label: t(`triggers.${tr}`) }))} value={trigger} onChange={setTrigger} compact />
            {suggestion ? (
              <Banner
                text={`${t(`alternatives.${trigger}.text`)}${suggestion.softened ? ` ${t('sos.softened')}` : ''}`}
                tone="success"
                icon="bulb-outline"
              />
            ) : null}
            {suggestion?.workout ? (
              <AppButton label={t('sos.suggestedWorkout', { title: t(`workouts.${suggestion.workout.key}.title`) })} variant="accent" icon="fitness-outline" onPress={() => {
                  begin({ intervention: 'workout', intensity, trigger });
                  router.push({ pathname: '/workout/[id]', params: { id: suggestion.workout!.id, from: 'sos' } });
                }} />
            ) : null}
          </View>
        ) : null}
      </AppCard>

      <AppButton label={t('sos.logOnly')} variant="ghost" icon="create-outline" onPress={() => router.push('/craving/log')} />
      <AppButton label={t('help.sosButton')} variant="secondary" icon="call-outline" onPress={() => router.push('/help')} />
      <AppText variant="caption" tone="secondary" align="center">
        {t('sos.footer')}
      </AppText>
    </Screen>
  );
}
