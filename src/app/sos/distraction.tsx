import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, AppCard, AppText, ChipGroup, Screen, SwitchRow } from '@/components/ui';
import { MemoryGame, NumberOrderGame } from '@/components/sos/MemoryGame';
import { useSosSession } from '@/store/useSosSession';
import { useNow } from '@/hooks/useNow';

type Activity = 'memory' | 'order' | 'grounding';

const GROUNDING_STEPS = ['see5', 'touch4', 'hear3', 'smell2', 'taste1'] as const;

export default function DistractionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const session = useSosSession();
  const [activity, setActivity] = useState<Activity>('memory');
  const [grounding, setGrounding] = useState<Record<string, boolean>>({});
  const [startedAt] = useState(() => Date.now());
  const now = useNow(1000);
  const [won, setWon] = useState(false);

  useEffect(() => {
    if (!session.active) session.begin({ intervention: 'distraction' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    const seconds = Math.round((now - startedAt) / 1000);
    session.finish(seconds, won || seconds >= 60);
    router.replace('/sos/feedback');
  };

  const groundingDone = GROUNDING_STEPS.every((s) => grounding[s]);
  useEffect(() => {
    if (groundingDone) setWon(true);
  }, [groundingDone]);

  return (
    <Screen footer={<AppButton label={t('common.finish')} icon="checkmark" onPress={finish} />}>
      <AppText variant="h1">{t('sos.distraction.title')}</AppText>
      <AppText tone="secondary">{t('sos.distraction.subtitle')}</AppText>
      <ChipGroup
        options={[
          { value: 'memory', label: t('sos.distraction.memory.title'), icon: 'grid-outline' },
          { value: 'order', label: t('sos.distraction.order.title'), icon: 'keypad-outline' },
          { value: 'grounding', label: t('sos.distraction.grounding.title'), icon: 'eye-outline' },
        ]}
        value={activity}
        onChange={setActivity}
        compact
      />
      {activity === 'memory' ? (
        <AppCard>
          <AppText tone="secondary" style={{ marginBottom: 10 }}>
            {t('sos.distraction.memory.hint')}
          </AppText>
          <MemoryGame onWin={() => setWon(true)} />
        </AppCard>
      ) : null}
      {activity === 'order' ? (
        <AppCard>
          <AppText tone="secondary" style={{ marginBottom: 10 }}>
            {t('sos.distraction.order.hint')}
          </AppText>
          <NumberOrderGame onWin={() => setWon(true)} />
        </AppCard>
      ) : null}
      {activity === 'grounding' ? (
        <AppCard>
          <AppText tone="secondary" style={{ marginBottom: 6 }}>
            {t('sos.distraction.grounding.hint')}
          </AppText>
          <View>
            {GROUNDING_STEPS.map((s) => (
              <SwitchRow key={s} label={t(`sos.distraction.grounding.${s}`)} value={Boolean(grounding[s])} onChange={(v) => setGrounding((g) => ({ ...g, [s]: v }))} />
            ))}
          </View>
          {groundingDone ? (
            <AppText weight="semibold" tone="success" style={{ marginTop: 8 }} accessibilityLiveRegion="polite">
              {t('sos.distraction.grounding.done')}
            </AppText>
          ) : null}
        </AppCard>
      ) : null}
      <AppText variant="caption" tone="secondary" align="center">
        {t('sos.distraction.elapsed', { seconds: Math.round((now - startedAt) / 1000) })}
      </AppText>
    </Screen>
  );
}
