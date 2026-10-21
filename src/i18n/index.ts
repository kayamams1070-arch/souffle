import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import type { Language } from '@/types';
import fr from './locales/fr.json';
import nl from './locales/nl.json';
import en from './locales/en.json';

export const SUPPORTED_LANGUAGES: Language[] = ['fr', 'nl', 'en'];

export function detectDeviceLanguage(): Language {
  try {
    const locales = getLocales();
    for (const locale of locales) {
      const code = (locale.languageCode ?? '').toLowerCase();
      if (code === 'fr' || code === 'nl' || code === 'en') return code;
    }
  } catch {
    // expo-localization unavailable (tests) -> default
  }
  return 'fr';
}

let initialized = false;

export function initI18n(language: Language): typeof i18n {
  if (!initialized) {
    void i18n.use(initReactI18next).init({
      resources: {
        fr: { translation: fr },
        nl: { translation: nl },
        en: { translation: en },
      },
      lng: language,
      fallbackLng: 'fr',
      interpolation: { escapeValue: false },
      returnNull: false,
    });
    initialized = true;
  } else if (i18n.language !== language) {
    void i18n.changeLanguage(language);
  }
  return i18n;
}

export function setLanguage(language: Language): void {
  if (i18n.language !== language) void i18n.changeLanguage(language);
}

export default i18n;
