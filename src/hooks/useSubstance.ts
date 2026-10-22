import { useUserStore } from '@/store';
import { substanceOf } from '@/utils/calculations';
import type { Substance } from '@/types';

/** The substance the current profile tracks ('tobacco' when no profile exists yet). */
export function useSubstance(): Substance {
  return useUserStore((s) => substanceOf(s.user));
}
