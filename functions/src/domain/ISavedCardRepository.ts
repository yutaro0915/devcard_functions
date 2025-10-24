import {SavedCard, SaveCardData} from "./SavedCard";

/**
 * SavedCard repository interface
 * Infrastructure layer will implement this interface
 */
export interface ISavedCardRepository {
  /**
   * Save a card to user's saved collection
   */
  save(data: SaveCardData): Promise<SavedCard>;

  /**
   * Get all saved cards for a user
   */
  findByUserId(userId: string): Promise<SavedCard[]>;

  /**
   * Check if a card is already saved
   */
  exists(userId: string, cardUserId: string): Promise<boolean>;

  /**
   * Delete a saved card
   */
  delete(userId: string, cardUserId: string): Promise<void>;

  /**
   * Update saved card metadata
   */
  update(userId: string, cardUserId: string, data: Partial<SavedCard>): Promise<void>;
}
