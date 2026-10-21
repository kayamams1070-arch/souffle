import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppButton, AppCard, AppText, Banner, ChipGroup, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useSettingsStore, useUserStore } from '@/store';
import type { QuitReason } from '@/types';
import { formatDate } from '@/utils/money';

const REASONS: QuitReason[] = ['family', 'health', 'breath', 'money', 'freedom', 'children', 'other'];

export default function PactScreen() {
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const updateUser = useUserStore((s) => s.updateUser);
  const signPact = useUserStore((s) => s.signPact);
  const language = useSettingsStore((s) => s.settings.language);
  const [editing, setEditing] = useState(false);
  const [why, setWhy] = useState(user?.why ?? '');
  const [reasons, setReasons] = useState<QuitReason[]>(user?.reasons ?? []);
  const [signature, setSignature] = useState(user?.pactSignature ?? user?.firstName ?? '');
  if (!user) return null;

  const save = () => {
    updateUser({ why: why.trim(), reasons });
    if (signature.trim() && signature.trim() !== user.pactSignature) signPact(signature);
    setEditing(false);
  };

  return (
    <Screen>
      <ScreenHeader title={t('pact.title')} />
      <AppCard tone="accent">
        <AppText variant="h3" tone="accent" style={{ fontStyle: 'italic' }}>
          {t('pact.text')}
        </AppText>
        {user.personalPactSignedAt ? (
          <AppText variant="caption" tone="accent" style={{ marginTop: 10 }}>
            {t('pact.signedOn', { date: formatDate(user.personalPactSignedAt, language), signature: user.pactSignature ?? '' })}
          </AppText>
        ) : null}
      </AppCard>
      {!editing ? (
        <>
          <AppCard title={t('pact.why')}>
            <AppText>{user.why || t('pact.noWhy')}</AppText>
            {user.reasons.length > 0 ? (
              <AppText variant="bodySmall" tone="secondary" style={{ marginTop: 8 }}>
                {user.reasons.map((r) => t(`reasons.${r}`)).join(' · ')}
              </AppText>
            ) : null}
          </AppCard>
          <AppButton label={t('common.edit')} variant="secondary" icon="create-outline" onPress={() => setEditing(true)} />
        </>
      ) : (
        <>
          <ChipGroup label={t('onboarding.pact.reasons')} options={REASONS.map((r) => ({ value: r, label: t(`reasons.${r}`) }))} value={reasons} onChange={(r) => setReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]))} multiple compact />
          <TextField label={t('onboarding.pact.why')} value={why} onChangeText={setWhy} multiline maxLength={500} />
          <TextField label={t('onboarding.pact.signature')} value={signature} onChangeText={setSignature} maxLength={60} />
          <AppButton label={t('common.save')} icon="checkmark" onPress={save} />
          <AppButton label={t('common.cancel')} variant="ghost" onPress={() => setEditing(false)} />
        </>
      )}
      <Banner text={t('pact.reminder')} tone="success" icon="heart-outline" />
    </Screen>
  );
}
