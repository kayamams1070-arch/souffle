import type { Language } from '@/types';

const LOCALE_BY_LANGUAGE: Record<Language, string> = {
  fr: 'fr-BE',
  nl: 'nl-BE',
  en: 'en-GB',
};

export function localeFor(language: Language): string {
  return LOCALE_BY_LANGUAGE[language];
}

/** Formats an amount in cents as euros for the given language. */
export function formatCents(cents: number, language: Language, maximumFractionDigits = 0): string {
  const euros = cents / 100;
  try {
    return new Intl.NumberFormat(localeFor(language), {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits,
      minimumFractionDigits: maximumFractionDigits > 0 ? maximumFractionDigits : 0,
    }).format(euros);
  } catch {
    return `${euros.toFixed(maximumFractionDigits)} €`;
  }
}

export function formatNumber(value: number, language: Language, maximumFractionDigits = 0): string {
  try {
    return new Intl.NumberFormat(localeFor(language), { maximumFractionDigits }).format(value);
  } catch {
    return value.toFixed(maximumFractionDigits);
  }
}

export function formatDate(value: string | Date, language: Language, withTime = false): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  try {
    return new Intl.DateTimeFormat(localeFor(language), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

export function formatTime(value: string | Date, language: Language): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  try {
    return new Intl.DateTimeFormat(localeFor(language), { hour: '2-digit', minute: '2-digit' }).format(
      d
    );
  } catch {
    return d.toLocaleTimeString();
  }
}

/** Parses a user typed price like "8,50" or "8.5" into cents. Returns null when invalid. */
export function parseEurosToCents(input: string): number | null {
  const cleaned = input.replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}
