/**
 * Moderator entity - user with elevated permissions
 * Stored in /moderators/{userId} collection
 */
export interface Moderator {
  userId: string;
  role: "admin" | "moderator";
  permissions: string[]; // e.g., ["badge:create", "badge:grant", "user:manage"]
  createdAt: Date;
}

/**
 * Data required to add a new moderator
 */
export interface AddModeratorData {
  userId: string;
  role: "admin" | "moderator";
  permissions: string[];
}
