import {Badge, CreateBadgeData} from "./Badge";
import {UserBadge, GrantBadgeData} from "./UserBadge";

/**
 * Badge repository interface
 * Infrastructure layer will implement this interface
 */
export interface IBadgeRepository {
  /**
   * Create a new badge
   */
  createBadge(data: CreateBadgeData): Promise<Badge>;

  /**
   * Find a badge by ID
   */
  findBadgeById(badgeId: string): Promise<Badge | null>;

  /**
   * List all active badges
   */
  listActiveBadges(): Promise<Badge[]>;

  /**
   * Grant a badge to a user
   */
  grantBadge(data: GrantBadgeData): Promise<UserBadge>;

  /**
   * Revoke a badge from a user
   */
  revokeBadge(userId: string, badgeId: string): Promise<void>;

  /**
   * Find a user's badge
   */
  findUserBadge(userId: string, badgeId: string): Promise<UserBadge | null>;

  /**
   * Check if a user already has a badge
   */
  hasUserBadge(userId: string, badgeId: string): Promise<boolean>;

  /**
   * Find all badges for a user
   */
  findUserBadges(userId: string): Promise<UserBadge[]>;

  /**
   * Update badge visibility for a user
   */
  updateVisibility(
    userId: string,
    badgeId: string,
    visibility: {showOnPublicCard: boolean; showOnPrivateCard: boolean}
  ): Promise<void>;

  /**
   * Get badge IDs that should be shown on public card
   */
  getBadgeIdsForPublicCard(userId: string): Promise<string[]>;

  /**
   * Get badge IDs that should be shown on private card
   */
  getBadgeIdsForPrivateCard(userId: string): Promise<string[]>;
}
