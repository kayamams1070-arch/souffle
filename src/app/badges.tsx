import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppCard, AppText, ProgressBar, Screen, ScreenHeader } from '@/components/ui';
import { useRewardStore, useSettingsStore } from '@/store';
import { useLevel } from '@/hooks/useRewards';
import { BADGES } from '@/data/badges';
import { XP_RULES } from '@/utils/constants';
import { formatDate } from '@/utils/money';
import type { BadgeCategory } from '@/types';

const CATEGORIES: BadgeCategory[] = ['smoke_free', 'craving', 'sport', 'consistency'];

export default function BadgesScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const badges = useRewardStore((s) => s.badges);
  const events = useRewardStore((s) => s.events);
  const language = useSettingsStore((s) => s.settings.language);
  const level = useLevel();
  const unlockedMap = new Map(badges.map((b) => [b.id, b.unlockedAt]));

  return (
    <Screen>
      <ScreenHeader title={t('badges.title')} subtitle={t('badges.subtitle')} />
      <AppCard tone="warm" title={t('progress.levelTitle', { level: level.level })} subtitle={t('progress.xpTotal', { xp: level.xp })}>
        <ProgressBar value={level.needed ? level.current / level.needed : 0} tone="warm" accessibilityValueText={`${level.current}/${level.needed}`} label={t('progress.nextLevel', { xp: level.needed - level.current })} />
      </AppCard>
      {CATEGORIES.map((cat) => (
        <AppCard key={cat} title={t(`badges.categories.${cat}`)}>
          <View style={{ gap: 12 }}>
            {BADGES.filter((b) => b.category === cat).map((b) => {
              const at = unlockedMap.get(b.id);
              return (
                <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: at ? 1 : 0.55 }} accessible accessibilityLabel={`${t(`badges.${b.key}.title`)}. ${at ? t('badges.unlockedOn', { date: formatDate(at, language) }) : t('badges.locked')}`}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: at ? theme.colors.warmSoft : theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={(at ? b.icon : 'lock-closed-outline') as never} size={24} color={at ? theme.colors.warmText : theme.colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText weight="semibold">{t(`badges.${b.key}.title`)}</AppText>
                    <AppText variant="caption" tone="secondary">
                      {t(`badges.${b.key}.description`)}
                    </AppText>
                    {at ? (
                      <AppText variant="caption" tone="warm">
                        {t('badges.unlockedOn', { date: formatDate(at, language) })}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </AppCard>
      ))}
      <AppCard title={t('badges.xpRules')} subtitle={t('badges.xpRulesHint')}>
        {(Object.keys(XP_RULES) as (keyof typeof XP_RULES)[]).map((k) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <AppText variant="bodySmall">{t(`xp.${k}`)}</AppText>
            <AppText variant="bodySmall" weight="semibold">
              +{XP_RULES[k]} XP
            </AppText>
          </View>
        ))}
        <AppText variant="caption" tone="secondary" style={{ marginTop: 8 }}>
          {t('badges.eventsCount', { count: events.length })}
        </AppText>
      </AppCard>
    </Screen>
  );
}
