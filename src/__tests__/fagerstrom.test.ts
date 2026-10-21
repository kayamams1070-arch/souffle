import {
  computeFagerstromScore,
  fagerstromLevel,
  fagerstromQ4IndexFromCigarettes,
  FAGERSTROM_MAX_SCORE,
  FAGERSTROM_QUESTIONS,
} from '@/utils/fagerstrom';

/**
 * Heatherton TF, Kozlowski LT, Frecker RC, Fagerström KO. The Fagerström Test for Nicotine
 * Dependence: a revision of the Fagerström Tolerance Questionnaire. Br J Addict 1991;86:1119-27.
 */
describe('Fagerström test (FTND)', () => {
  it('has the six published items with their exact scoring', () => {
    expect(FAGERSTROM_QUESTIONS.map((q) => q.points)).toEqual([
      [3, 2, 1, 0], // time to first cigarette: <=5, 6-30, 31-60, >60 min
      [1, 0], // difficult to refrain in forbidden places
      [1, 0], // the first one in the morning is the hardest to give up
      [0, 1, 2, 3], // cigarettes/day: <=10, 11-20, 21-30, >=31
      [1, 0], // smokes more in the first hours after waking
      [1, 0], // smokes when ill in bed
    ]);
  });

  it('scores 0 to 10', () => {
    expect(computeFagerstromScore([3, 1, 1, 0, 1, 1])).toBe(0);
    expect(computeFagerstromScore([0, 0, 0, 3, 0, 0])).toBe(FAGERSTROM_MAX_SCORE);
    expect(computeFagerstromScore([1, 0, 1, 1, 0, 1])).toBe(2 + 1 + 0 + 1 + 1 + 0);
  });

  it('ignores missing or out-of-range answers', () => {
    expect(computeFagerstromScore([0])).toBe(3);
    expect(computeFagerstromScore([9, -1])).toBe(0);
  });

  it('uses the usual interpretation bands', () => {
    expect([0, 1, 2].map(fagerstromLevel)).toEqual(['low', 'low', 'low']);
    expect([3, 4, 5].map(fagerstromLevel)).toEqual(['moderate', 'moderate', 'moderate']);
    expect([6, 7].map(fagerstromLevel)).toEqual(['high', 'high']);
    expect([8, 9, 10].map(fagerstromLevel)).toEqual(['very_high', 'very_high', 'very_high']);
  });

  it('pre-fills question 4 from the declared consumption', () => {
    expect([5, 10, 11, 20, 21, 30, 31, 60].map(fagerstromQ4IndexFromCigarettes)).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3,
    ]);
  });
});
