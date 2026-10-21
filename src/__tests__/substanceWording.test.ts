import { t } from 'i18next';
import { initI18n, setSubstance } from '@/i18n';

describe('wording adapted to the substance', () => {
  beforeAll(() => {
    initI18n('fr');
  });
  afterAll(() => setSubstance('tobacco'));

  it('switches tobacco, cannabis and mixed wording in every language, and back', () => {
    setSubstance('tobacco');
    expect(t('dashboard.counter.title', { lng: 'fr' })).toBe('Sans tabac depuis');
    setSubstance('cannabis');
    expect(t('dashboard.counter.title', { lng: 'fr' })).toBe('Sans cannabis depuis');
    expect(t('dashboard.savings.avoided', { lng: 'fr', count: 3 })).toBe('3 joints évités');
    setSubstance('both');
    expect(t('dashboard.counter.title', { lng: 'fr' })).toBe('Sans tabac ni cannabis depuis');
    setSubstance('tobacco');
    expect(t('dashboard.counter.title', { lng: 'fr' })).toBe('Sans tabac depuis');
    // Keys not overridden keep the base wording.
    expect(t('common.save', { lng: 'fr' })).toBe('Enregistrer');
  });
});
