import fr from '@/i18n/locales/fr.json';
import nl from '@/i18n/locales/nl.json';
import en from '@/i18n/locales/en.json';
import { COACH_PROMPTS, detectIntent } from '@/services/coachService';

const { collectKeys, checkLocale } = require('../../scripts/i18nKeys.js');

const LOCALES = { fr, nl, en } as const;

describe('translations', () => {
  const { required, unknownTemplates } = collectKeys();

  it('knows every dynamic key template used in the code', () => {
    expect(unknownTemplates).toEqual([]);
  });

  it.each(Object.keys(LOCALES))('%s has every key used by the app, with valid placeholders', (lang) => {
    const report = checkLocale(lang, required);
    expect(report.missing).toEqual([]);
    expect(report.badVars).toEqual([]);
    expect(report.unused).toEqual([]);
  });

  it.each(Object.entries(LOCALES))('%s quick coach prompts are understood by the local coach', (_lang, dict) => {
    const prompts = (dict as { coach: { prompts: Record<string, string> } }).coach.prompts;
    for (const p of COACH_PROMPTS) {
      expect({ id: p.id, intent: detectIntent(prompts[p.id] ?? '') }).toEqual({ id: p.id, intent: p.intent });
    }
  });

  it('keeps the same keys in every language', () => {
    const { flatten } = require('../../scripts/i18nKeys.js');
    const base = Object.keys(flatten(fr)).sort();
    expect(Object.keys(flatten(nl)).sort()).toEqual(base);
    expect(Object.keys(flatten(en)).sort()).toEqual(base);
  });
});
