/**
 * Interfaces prepared for V2 features that need a server. V1 ships only the local
 * "unavailable" implementations below: no screen may present these features as working.
 *
 * - SyncProvider: optional encrypted cloud backup / multi-device sync
 * - SocialProvider: family follow-up, encouragements, private remote challenges, moderated forum
 * - PremiumProvider: subscriptions, partner rewards, donations
 * - The remote AI coach plugs into `CoachProvider` (services/coachService.ts).
 */
export type Availability = { available: false; reason: 'requires_server' } | { available: true };

export interface SyncProvider {
  availability(): Availability;
  /** Uploads an encrypted snapshot (services/dataService.snapshotData). */
  push(encryptedSnapshot: string): Promise<void>;
  pull(): Promise<string | null>;
}

export interface FamilyLink {
  id: string;
  /** Display name chosen by the user. No contact details of third parties are stored. */
  nickname: string;
  /** What the user explicitly agreed to share. */
  shares: ('smoke_free_days' | 'workouts' | 'victories')[];
}

export interface SocialProvider {
  availability(): Availability;
  invite(nickname: string): Promise<FamilyLink>;
  sendEncouragement(linkId: string, message: string): Promise<void>;
}

export interface PremiumProvider {
  availability(): Availability;
  isPremium(): boolean;
}

const unavailable: Availability = { available: false, reason: 'requires_server' };

const notImplemented = async (): Promise<never> => {
  throw new Error('This feature requires a server and is not available in Souffle V1.');
};

export const localSync: SyncProvider = { availability: () => unavailable, push: notImplemented, pull: notImplemented };
export const localSocial: SocialProvider = { availability: () => unavailable, invite: notImplemented, sendEncouragement: notImplemented };
export const localPremium: PremiumProvider = { availability: () => unavailable, isPremium: () => false };
