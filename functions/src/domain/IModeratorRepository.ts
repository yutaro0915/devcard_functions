import {Moderator, AddModeratorData} from "./Moderator";

/**
 * Moderator repository interface
 * Infrastructure layer will implement this interface
 */
export interface IModeratorRepository {
  /**
   * Add a new moderator
   */
  addModerator(data: AddModeratorData): Promise<Moderator>;

  /**
   * Find a moderator by userId
   */
  findById(userId: string): Promise<Moderator | null>;

  /**
   * Check if a user is a moderator or admin
   */
  isModerator(userId: string): Promise<boolean>;

  /**
   * Set Custom Claims for a user (moderator: true, admin: true/false)
   */
  setCustomClaims(userId: string, claims: {moderator?: boolean; admin?: boolean}): Promise<void>;
}
