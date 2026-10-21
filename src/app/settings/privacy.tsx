import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppButton, AppCard, AppText, Banner, ConfirmDialog, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useCravingStore, useJournalStore, useSettingsStore, useUserStore, useWorkoutStore } from '@/store';
import { deleteAllData, enterDemo, exitDemo, hasDemoBackup, loadDemoIntoStores } from '@/services/dataService';
import { exportJson, importJsonFromFile } from '@/services/exportService';

type Status = { tone: 'success' | 'danger' | 'info'; text: string } | null;

export default function PrivacyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const settings = useSettingsStore((s) => s.settings);
  const counts = {
    cravings: useCravingStore((s) => s.cravings.length),
    smoking: useCravingStore((s) => s.smokingEvents.length),
    sessions: useWorkoutStore((s) => s.sessions.length),
    journal: useJournalStore((s) => s.entries.length + s.sleep.length + s.cough.length),
  };
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [confirmImport, setConfirmImport] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [backup, setBackup] = useState(false);
  const deleteWord = t('privacy.deleteWord');

  useEffect(() => {
    let mounted = true;
    hasDemoBackup().then((v) => {
      if (mounted) setBackup(v);
    });
    return () => {
      mounted = false;
    };
  }, [settings.demoMode]);

  const doExport = async () => {
    setBusy(true);
    const r = await exportJson();
    setBusy(false);
    setStatus(r.ok ? { tone: 'success', text: t('privacy.exportDone') } : { tone: 'danger', text: t(`privacy.errors.${r.error}`) });
  };

  const doImport = async () => {
    setConfirmImport(false);
    setBusy(true);
    const r = await importJsonFromFile();
    setBusy(false);
    if (!r.ok) {
      if (r.error === 'canceled') return;
      setStatus({ tone: 'danger', text: t(`privacy.errors.${r.error}`) });
      return;
    }
    setStatus({ tone: 'success', text: 'skipped' in r && r.skipped > 0 ? t('privacy.importDoneSkipped', { count: r.skipped }) : t('privacy.importDone') });
  };

  const doDelete = async () => {
    setConfirmDelete(false);
    setConfirmText('');
    setBusy(true);
    await deleteAllData();
    setBusy(false);
    router.replace('/onboarding');
  };

  const doEnterDemo = async () => {
    setConfirmDemo(false);
    await enterDemo(settings.language);
    router.replace('/(tabs)');
  };

  const doExitDemo = async () => {
    const r = await exitDemo();
    router.replace(r.restored ? '/(tabs)' : '/onboarding');
  };

  return (
    <Screen>
      <ScreenHeader title={t('settings.privacy.title')} subtitle={t('privacy.subtitle')} />
      <AppCard title={t('privacy.whatTitle')}>
        <AppText variant="bodySmall">{t('privacy.what')}</AppText>
        {user ? (
          <AppText variant="caption" tone="secondary" style={{ marginTop: 8 }}>
            {t('privacy.counts', { cravings: counts.cravings, smoking: counts.smoking, sessions: counts.sessions, journal: counts.journal })}
          </AppText>
        ) : null}
      </AppCard>
      <AppCard title={t('privacy.whereTitle')}>
        <AppText variant="bodySmall">{t('privacy.where')}</AppText>
      </AppCard>
      <AppCard title={t('privacy.thirdPartyTitle')}>
        <AppText variant="bodySmall">{t('privacy.thirdParty')}</AppText>
      </AppCard>
      <AppCard title={t('privacy.permissionsTitle')}>
        <AppText variant="bodySmall">{t('privacy.permissions')}</AppText>
      </AppCard>

      {user ? (
        <AppCard title={t('privacy.exportTitle')} subtitle={t('privacy.exportHint')}>
          <View style={{ gap: 10 }}>
            <AppButton label={t('privacy.exportJson')} icon="download-outline" variant="secondary" onPress={() => void doExport()} loading={busy} />
            <AppButton label={t('privacy.reportPdf')} icon="document-text-outline" variant="ghost" onPress={() => router.push('/reports')} />
          </View>
        </AppCard>
      ) : null}
      <AppCard title={t('privacy.importTitle')} subtitle={t('privacy.importHint')}>
        <AppButton label={t('privacy.importJson')} icon="cloud-upload-outline" variant="ghost" onPress={() => (user ? setConfirmImport(true) : void doImport())} disabled={busy} />
      </AppCard>

      <AppCard title={t('demo.title')} tone="warm">
        <AppText variant="bodySmall" tone="warm">
          {settings.demoMode ? t('demo.activeText') : t('demo.inactiveText')}
        </AppText>
        <View style={{ gap: 8, marginTop: 10 }}>
          {settings.demoMode ? (
            <>
              <AppButton label={t('demo.reset')} variant="secondary" size="sm" icon="refresh-outline" onPress={() => loadDemoIntoStores(settings.language)} />
              <AppButton label={backup ? t('demo.exitRestore') : t('demo.exit')} variant="primary" size="sm" icon="exit-outline" onPress={() => void doExitDemo()} />
            </>
          ) : (
            <AppButton label={t('demo.load')} variant="secondary" size="sm" icon="play-outline" onPress={() => (user ? setConfirmDemo(true) : void doEnterDemo())} />
          )}
        </View>
      </AppCard>

      {status ? <Banner text={status.text} tone={status.tone} /> : null}

      {user ? (
        <AppCard title={t('privacy.deleteTitle')} tone="danger">
          <AppText variant="bodySmall">{t('privacy.deleteText')}</AppText>
          <AppButton label={t('privacy.deleteButton')} variant="danger" icon="trash-outline" style={{ marginTop: 10 }} onPress={() => setConfirmDelete(true)} />
        </AppCard>
      ) : null}
      <AppText variant="caption" tone="secondary">
        {t('privacy.gdprNote')}
      </AppText>

      <ConfirmDialog
        visible={confirmDelete}
        title={t('privacy.deleteConfirmTitle')}
        message={t('privacy.deleteConfirmText', { word: deleteWord })}
        confirmLabel={t('privacy.deleteButton')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          if (confirmText.trim().toUpperCase() === deleteWord.toUpperCase()) void doDelete();
        }}
        onCancel={() => {
          setConfirmDelete(false);
          setConfirmText('');
        }}>
        <TextField label={t('privacy.deleteTypeWord', { word: deleteWord })} value={confirmText} onChangeText={setConfirmText} autoCapitalize="characters" testID="delete-confirm-input" />
        {confirmText.length > 0 && confirmText.trim().toUpperCase() !== deleteWord.toUpperCase() ? (
          <AppText variant="caption" tone="danger">
            {t('privacy.deleteWordMismatch')}
          </AppText>
        ) : null}
      </ConfirmDialog>
      <ConfirmDialog visible={confirmImport} title={t('privacy.importConfirmTitle')} message={t('privacy.importConfirmText')} confirmLabel={t('privacy.importJson')} cancelLabel={t('common.cancel')} onConfirm={() => void doImport()} onCancel={() => setConfirmImport(false)} />
      <ConfirmDialog visible={confirmDemo} title={t('demo.confirmTitle')} message={t('demo.confirmText')} confirmLabel={t('demo.load')} cancelLabel={t('common.cancel')} onConfirm={() => void doEnterDemo()} onCancel={() => setConfirmDemo(false)} />
    </Screen>
  );
}
