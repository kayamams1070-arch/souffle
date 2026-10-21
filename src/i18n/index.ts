import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import type { Language, Substance } from '@/types';
import fr from './locales/fr.json';
import nl from './locales/nl.json';
import en from './locales/en.json';
import frCannabis from './locales/overlays/fr.cannabis.json';
import frBoth from './locales/overlays/fr.both.json';
import nlCannabis from './locales/overlays/nl.cannabis.json';
import nlBoth from './locales/overlays/nl.both.json';
import enCannabis from './locales/overlays/en.cannabis.json';
import enBoth from './locales/overlays/en.both.json';

type Resource = Record<string, unknown>;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const BASE: Record<Language, Resource> = { fr, nl, en };

/**
 * Wording overlays for people who consume cannabis, or tobacco and cannabis. Each overlay
 * only redefines existing keys ("sans tabac" -> "sans cannabis", "cigarette" -> "joint"…);
 * every other text stays the base translation. Checked by scripts/i18nKeys.js.
 */
export const SUBSTANCE_OVERLAYS: Record<Exclude<Substance, 'tobacco'>, Record<Language, Resource>> = {
  cannabis: { fr: frCannabis, nl: nlCannabis, en: enCannabis },
  both: { fr: frBoth, nl: nlBoth, en: enBoth },
};

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
    // eslint-disable-next-line import/no-named-as-default-member
    void i18n.use(initReactI18next).init({
      // Copies: i18next merges overlays into its store, the imported base must stay intact.
      resources: {
        fr: { translation: clone(fr) },
        nl: { translation: clone(nl) },
        en: { translation: clone(en) },
      },
      lng: language,
      fallbackLng: 'fr',
      interpolation: { escapeValue: false },
      returnNull: false,
      // Re-render when the wording overlay changes (see setSubstance).
      react: { bindI18nStore: 'added' },
    });
    initialized = true;
  } else if (i18n.language !== language) {
    // eslint-disable-next-line import/no-named-as-default-member
    void i18n.changeLanguage(language);
  }
  return i18n;
}

export function setLanguage(language: Language): void {
  // eslint-disable-next-line import/no-named-as-default-member
  if (i18n.language !== language) void i18n.changeLanguage(language);
}

function deepMerge(target: Resource, source: Resource): void {
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];
    if (value && typeof value === 'object' && existing && typeof existing === 'object') {
      deepMerge(existing as Resource, value as Resource);
    } else {
      target[key] = value;
    }
  }
}

let currentSubstance: Substance = 'tobacco';

/**
 * Applies the wording of the person's substance to every language. Idempotent and
 * synchronous, so it can run before the first render.
 */
export function setSubstance(substance: Substance): void {
  if (substance === currentSubstance) return;
  currentSubstance = substance;
  for (const lang of SUPPORTED_LANGUAGES) {
    // Fresh copy of the base wording, then the overlay (which only overwrites base keys).
    const bundle = clone(BASE[lang]);
    if (substance !== 'tobacco') deepMerge(bundle, SUBSTANCE_OVERLAYS[substance][lang]);
    i18n.removeResourceBundle(lang, 'translation');
    i18n.addResourceBundle(lang, 'translation', bundle, true, true);
  }
}

export function getSubstanceWording(): Substance {
  return currentSubstance;
}

export default i18n;
