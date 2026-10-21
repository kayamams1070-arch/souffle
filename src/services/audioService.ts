/**
 * Voice guidance through the device's text-to-speech engine (expo-speech). Works offline
 * when the system has a voice for the language installed; otherwise the OS silently
 * skips, and the UI always shows the same instructions as text.
 */
import * as Speech from 'expo-speech';
import type { Language } from '@/types';

const SPEECH_LOCALE: Record<Language, string> = { fr: 'fr-FR', nl: 'nl-NL', en: 'en-GB' };

let available: boolean | null = null;

export async function isVoiceAvailable(language: Language): Promise<boolean> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    available = voices.some((v) => v.language.toLowerCase().startsWith(language));
    return available;
  } catch {
    available = false;
    return false;
  }
}

export function speak(text: string, language: Language, options?: { rate?: number; onDone?: () => void }): void {
  try {
    Speech.speak(text, {
      language: SPEECH_LOCALE[language],
      rate: options?.rate ?? 0.9,
      pitch: 1,
      onDone: options?.onDone,
      onError: options?.onDone,
    });
  } catch {
    options?.onDone?.();
  }
}

export async function stopSpeaking(): Promise<void> {
  try {
    await Speech.stop();
  } catch {
    // ignore
  }
}

export async function pauseSpeaking(): Promise<void> {
  try {
    await Speech.pause();
  } catch {
    // Android does not support pause: stop instead.
    await stopSpeaking();
  }
}

export async function resumeSpeaking(): Promise<void> {
  try {
    await Speech.resume();
  } catch {
    // ignore
  }
}
