export * from './user';
export * from './craving';
export * from './workout';
export * from './rewards';
export * from './journal';
export * from './settings';

export interface HealthMilestone {
  id: string;
  /** Minutes after the last cigarette or joint. */
  afterMinutes: number;
  /** Translation key prefix: health.milestones.<id>.title / .description */
  key: string;
  category: 'cardio' | 'blood' | 'senses' | 'lungs' | 'risk' | 'withdrawal' | 'sleep' | 'mind';
  /** Which timeline the milestone belongs to. */
  substance: 'tobacco' | 'cannabis';
  /** Benefits that vary between people and cannot be measured by the phone. */
  variesByPerson: boolean;
  sourceIds: string[];
}
