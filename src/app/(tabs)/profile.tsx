import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppButton, AppCard, AppText, Banner, ListRow, Screen } from '@/components/ui';
import { useSettingsStore, useUserStore } from '@/store';
import { formatCents, formatDate } from '@/utils/money';
import { APP_NAME, APP_VERSION } from '@/utils/constants';

export default function ProfileScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const settings = useSettingsStore((s) => s.settings);
  if (!user) return null;

  return (
    <Screen insideTabs>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="person" size={32} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="h1">{user.firstName || t('profile.anonymous')}</AppText>
          <AppText tone="secondary">{user.goal === 'quit' ? t('goal.quit') : t('goal.reduce')} · {t(`level.${user.sportLevel}`)}</AppText>
        </View>
      </View>
      {settings.demoMode ? <Banner text={t('demo.banner')} tone="warm" /> : null}

      <AppCard title={t('profile.habits')} onPress={() => router.push('/edit-profile')}>
        <AppText variant="bodySmall" tone="secondary">
          {t('profile.habitsSummary', { cigs: user.smokingBaselinePerDay, years: user.smoking.yearsSmoking, price: formatCents(user.smoking.packPriceCents, settings.language, 2), perPack: user.smoking.cigarettesPerPack })}
        </AppText>
        {user.smoking.dependenceScore !== undefined ? (
          <AppText variant="bodySmall" tone="secondary" style={{ marginTop: 4 }}>
            {t('profile.fagerstrom', { score: user.smoking.dependenceScore, level: t(`dependence.${user.smoking.dependenceLevel ?? 'low'}`) })}
          </AppText>
        ) : null}
        {user.quitDate ? (
          <AppText variant="bodySmall" tone="secondary" style={{ marginTop: 4 }}>
            {t('profile.quitDate', { date: formatDate(user.quitDate, settings.language, true) })}
          </AppText>
        ) : null}
        <AppText variant="caption" tone="accent" style={{ marginTop: 6 }}>
          {t('common.tapToEdit')}
        </AppText>
      </AppCard>

      <AppCard>
        <ListRow icon="flag-outline" title={t('goalSettings.title')} subtitle={t('goalSettings.subtitle')} onPress={() => router.push('/goal-settings')} />
        <ListRow icon="document-text-outline" title={t('pact.title')} subtitle={user.why ? user.why.slice(0, 60) : t('dashboard.pactHint')} onPress={() => router.push('/pact')} />
        <ListRow icon="wallet-outline" title={t('benefits.projectTitle')} subtitle={user.savingsProject ? user.savingsProject.title : t('benefits.projectHint')} onPress={() => router.push('/health/benefits')} />
        <ListRow icon="chatbubble-ellipses-outline" title={t('coach.title')} subtitle={t('coach.subtitle')} onPress={() => router.push('/coach')} />
      </AppCard>

      <AppCard title={t('settings.title')}>
        <ListRow icon="language-outline" title={t('settings.language.title')} subtitle={t(`settings.language.${settings.language}`)} onPress={() => router.push('/settings/language')} />
        <ListRow icon="contrast-outline" title={t('settings.accessibility.title')} subtitle={t(`settings.theme.${settings.theme}`)} onPress={() => router.push('/settings/accessibility')} />
        <ListRow icon="notifications-outline" title={t('settings.notifications.title')} subtitle={settings.notifications.enabled ? t('common.on') : t('common.off')} onPress={() => router.push('/settings/notifications')} />
        <ListRow icon="lock-closed-outline" title={t('settings.privacy.title')} subtitle={t('settings.privacy.subtitle')} onPress={() => router.push('/settings/privacy')} />
        <ListRow icon="document-outline" title={t('reports.title')} subtitle={t('reports.subtitle')} onPress={() => router.push('/reports')} />
        <ListRow icon="people-outline" title={t('family.title')} subtitle={t('family.subtitle')} onPress={() => router.push('/family')} />
        <ListRow icon="information-circle-outline" title={t('about.title')} subtitle={`${APP_NAME} ${APP_VERSION}`} onPress={() => router.push('/settings/about')} />
      </AppCard>

      {user.goal === 'quit' ? <AppButton label={t('dashboard.smokedButton')} variant="ghost" icon="cloud-outline" onPress={() => router.push('/relapse')} /> : null}
      <AppText variant="caption" tone="secondary" align="center">
        {t('about.notMedical')}
      </AppText>
    </Screen>
  );
}
