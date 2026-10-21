import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppButton, AppCard, AppText, Banner, ChipGroup, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useCravingStore, useSettingsStore, useUserStore, useWorkoutStore } from '@/store';
import { useSosSession } from '@/store/useSosSession';
import { coach, COACH_PROMPTS, type CoachAction, type CoachReply } from '@/services/coachService';
import type { Mood } from '@/types';

const MOODS: Mood[] = ['calm', 'ok', 'tense', 'tired', 'irritated', 'sad'];

export default function CoachScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const sessions = useWorkoutStore((s) => s.sessions);
  const cravings = useCravingStore((s) => s.cravings);
  const language = useSettingsStore((s) => s.settings.language);
  const sos = useSosSession();
  const [message, setMessage] = useState('');
  const [mood, setMood] = useState<Mood | null>(null);
  const [reply, setReply] = useState<CoachReply | null>(null);
  const [asked, setAsked] = useState('');
  if (!user) return null;

  const ask = (text: string) => {
    if (!text.trim()) return;
    const r = coach.reply(text, { user, sessions, cravings, mood: mood ?? undefined, language });
    setReply(r as CoachReply);
    setAsked(text);
  };

  const run = (action: CoachAction) => {
    switch (action.type) {
      case 'breathing':
        sos.begin({ intervention: 'breathing' });
        router.push('/sos/breathing');
        return;
      case 'surf':
        sos.begin({ intervention: 'craving_surf' });
        router.push('/craving/surf');
        return;
      case 'distraction':
        sos.begin({ intervention: 'distraction' });
        router.push('/sos/distraction');
        return;
      case 'workout':
        router.push(action.workoutId ? { pathname: '/workout/[id]', params: { id: action.workoutId } } : '/(tabs)/sport');
        return;
      case 'pact':
        router.push('/pact');
        return;
      case 'relapse':
        router.push('/relapse');
        return;
      case 'journal':
        router.push('/journal');
        return;
      case 'rest':
      case 'medical':
        return;
    }
  };

  const actionLabel = (a: CoachAction) => (a.type === 'workout' ? t('coach.actions.workout') : t(`coach.actions.${a.type}`));

  return (
    <Screen>
      <ScreenHeader title={t('coach.title')} subtitle={t('coach.subtitle')} />
      <Banner text={t('coach.localNote')} icon="hardware-chip-outline" />
      <ChipGroup label={t('coach.quickPrompts')} options={COACH_PROMPTS.map((p) => ({ value: p.id, label: t(`coach.prompts.${p.id}`) }))} value={null} onChange={(id) => { const text = t(`coach.prompts.${id}`); setMessage(text); ask(text); }} compact />
      <ChipGroup label={t('coach.moodOptional')} options={MOODS.map((m) => ({ value: m, label: t(`moods.${m}`) }))} value={mood} onChange={setMood} compact />
      <TextField label={t('coach.yourMessage')} value={message} onChangeText={setMessage} multiline maxLength={300} placeholder={t('coach.placeholder')} />
      <AppButton label={t('coach.send')} icon="send" onPress={() => ask(message)} disabled={!message.trim()} />
      {reply ? (
        <AppCard tone="primary">
          <AppText variant="caption" tone="secondary">
            {t('coach.youSaid')}: {asked}
          </AppText>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <Ionicons name="chatbubble-ellipses" size={22} color={theme.colors.primary} />
            <View style={{ flex: 1, gap: 8 }}>
              <AppText>{t(`coach.replies.${reply.key}.message`, reply.vars)}</AppText>
              <AppText variant="bodySmall" tone="secondary">
                {t(`coach.replies.${reply.key}.why`, reply.vars)}
              </AppText>
            </View>
          </View>
          {reply.needsClarification ? (
            <View style={{ marginTop: 10 }}>
              <ChipGroup options={COACH_PROMPTS.map((p) => ({ value: p.id, label: t(`coach.prompts.${p.id}`) }))} value={null} onChange={(id) => { const text = t(`coach.prompts.${id}`); setMessage(text); ask(text); }} compact />
            </View>
          ) : (
            <View style={{ gap: 8, marginTop: 12 }}>
              {reply.action.type !== 'rest' && reply.action.type !== 'medical' ? <AppButton label={actionLabel(reply.action)} icon="play" onPress={() => run(reply.action)} /> : <Banner text={t(`coach.actions.${reply.action.type}`)} tone="warm" icon="medkit-outline" />}
              {reply.alternative.type !== 'rest' && reply.alternative.type !== 'medical' ? <AppButton label={`${t('coach.alternative')}: ${actionLabel(reply.alternative)}`} variant="secondary" onPress={() => run(reply.alternative)} /> : <Banner text={t(`coach.actions.${reply.alternative.type}`)} tone="warm" icon="medkit-outline" />}
            </View>
          )}
        </AppCard>
      ) : null}
      <AppText variant="caption" tone="secondary">
        {t('coach.limits')}
      </AppText>
    </Screen>
  );
}
