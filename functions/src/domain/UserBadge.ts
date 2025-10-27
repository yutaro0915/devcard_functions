/**
 * UserBadge entity - badge granted to a user
 * Stored in /users/{userId}/badges/{badgeId} subcollection
 */
export interface UserBadge {
  badgeId: string;
  grantedAt: Date;
  grantedBy: string; // Moderator's userId
  reason?: string; // Optional reason for granting

  // Visibility settings (Phase 1: always default to true)
  visibility: {
    showOnPublicCard: boolean; // Default: true
    showOnPrivateCard: boolean; // Default: true
  };
}

/**
 * Data required to grant a badge to a user
 */
export interface GrantBadgeData {
  userId: string; // Target user
  badgeId: string;
  grantedBy: string; // Moderator's userId
  reason?: string;
}
