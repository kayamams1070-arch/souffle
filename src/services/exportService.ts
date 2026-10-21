/**
 * File-level export / import. Native: files are written to the app cache and handed to
 * the system share sheet (the user chooses where they go). Web (development preview):
 * a download is triggered instead. Nothing is ever uploaded by the app itself.
 */
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { importFromJson, serializeSnapshot, snapshotData, type ImportResult } from './dataService';

export type ExportOutcome = { ok: true; uri?: string } | { ok: false; error: 'sharing_unavailable' | 'write_failed' | 'print_failed' | 'canceled' };

function timestamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function downloadOnWeb(content: string, filename: string, mimeType: string): void {
  const doc = (globalThis as { document?: Document }).document;
  if (!doc) return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = filename;
  doc.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Exports every local data store as a JSON file (settings included) and opens the share sheet. */
export async function exportJson(): Promise<ExportOutcome> {
  const content = serializeSnapshot(snapshotData({ includeSettings: true }));
  const filename = `souffle-export-${timestamp()}.json`;
  if (Platform.OS === 'web') {
    downloadOnWeb(content, filename, 'application/json');
    return { ok: true };
  }
  try {
    const file = new File(Paths.cache, filename);
    file.create({ overwrite: true });
    await file.write(content);
    if (!(await Sharing.isAvailableAsync())) return { ok: false, error: 'sharing_unavailable' };
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: filename, UTI: 'public.json' });
    return { ok: true, uri: file.uri };
  } catch {
    return { ok: false, error: 'write_failed' };
  }
}

function pickTextOnWeb(): Promise<string | null> {
  const doc = (globalThis as { document?: Document }).document;
  if (!doc) return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      void f.text().then(resolve, () => resolve(null));
    };
    input.click();
  });
}

/** Lets the user pick a previous export and restores it after validation. */
export async function importJsonFromFile(): Promise<ImportResult | { ok: false; error: 'canceled' | 'read_failed' }> {
  try {
    let text: string | null;
    if (Platform.OS === 'web') {
      text = await pickTextOnWeb();
    } else {
      const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
      if (picked.canceled) return { ok: false, error: 'canceled' };
      text = await picked.result.text();
    }
    if (text === null) return { ok: false, error: 'canceled' };
    return importFromJson(text);
  } catch {
    return { ok: false, error: 'read_failed' };
  }
}

/** Generates a PDF from HTML on the device and offers to share / save it. */
export async function exportPdf(html: string, filename: string): Promise<ExportOutcome> {
  if (Platform.OS === 'web') {
    try {
      await Print.printAsync({ html });
      return { ok: true };
    } catch {
      return { ok: false, error: 'print_failed' };
    }
  }
  try {
    const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
    let finalUri = uri;
    try {
      const source = new File(uri);
      const target = new File(Paths.cache, filename);
      if (target.exists) target.delete();
      await source.move(target);
      finalUri = target.uri;
    } catch {
      // Keep the generated name if renaming is not possible.
    }
    if (!(await Sharing.isAvailableAsync())) return { ok: false, error: 'sharing_unavailable' };
    await Sharing.shareAsync(finalUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: filename });
    return { ok: true, uri: finalUri };
  } catch {
    return { ok: false, error: 'print_failed' };
  }
}

/** Shares a short, voluntarily written text summary (family mode without a server). */
export async function shareText(text: string, filename: string): Promise<ExportOutcome> {
  if (Platform.OS === 'web') {
    downloadOnWeb(text, filename, 'text/plain');
    return { ok: true };
  }
  try {
    const file = new File(Paths.cache, filename);
    file.create({ overwrite: true });
    await file.write(text);
    if (!(await Sharing.isAvailableAsync())) return { ok: false, error: 'sharing_unavailable' };
    await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', UTI: 'public.plain-text', dialogTitle: filename });
    return { ok: true, uri: file.uri };
  } catch {
    return { ok: false, error: 'write_failed' };
  }
}
