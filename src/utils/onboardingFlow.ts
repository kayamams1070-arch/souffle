import type { Substance } from '@/types';

/** First dependence test for the substance: Fagerström (nicotine) or CUDIT-R (cannabis). */
export function dependenceTestRoute(substance: Substance | undefined): '/onboarding/fagerstrom' | '/onboarding/cudit' {
  return substance === 'cannabis' ? '/onboarding/cudit' : '/onboarding/fagerstrom';
}

/** After the Fagerström test, a mixed profile also answers the CUDIT-R. */
export function afterFagerstromRoute(substance: Substance | undefined): '/onboarding/cudit' | '/onboarding/health' {
  return substance === 'both' ? '/onboarding/cudit' : '/onboarding/health';
}
