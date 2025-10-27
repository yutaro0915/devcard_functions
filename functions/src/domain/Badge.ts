/**
 * Badge entity - platform-wide badge definition
 * Stored in /badges/{badgeId} collection
 */
export interface Badge {
  badgeId: string;
  name: string; // 1-50 characters
  description: string; // 1-500 characters
  iconUrl?: string; // Optional badge icon (HTTPS URL)
  color?: string; // Optional color (e.g., "#FFD700")
  priority: number; // Display priority (lower = higher priority)
  isActive: boolean; // Active/inactive flag
  createdAt: Date;
  createdBy: string; // Moderator's userId
}

/**
 * Data required to create a new badge
 */
export interface CreateBadgeData {
  name: string;
  description: string;
  iconUrl?: string;
  color?: string;
  priority: number;
  isActive: boolean;
  createdBy: string;
}
