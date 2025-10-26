import {SavedCard, SaveCardData} from "./SavedCard";

/**
 * Options for filtering saved cards
 * Issue #25: Added startAfter for pagination
 */
export interface FindSavedCardsOptions {
  cardType?: "public" | "private";
  eventId?: string;
  limit?: number;
  startAfter?: string; // savedCardId to start after (for pagination)
}

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
   * Get all saved cards for a user with optional filters
   */
  findByUserId(userId: string, options?: FindSavedCardsOptions): Promise<SavedCard[]>;

  /**
   * Get a saved card by savedCardId
   */
  findById(userId: string, savedCardId: string): Promise<SavedCard | null>;

  /**
   * Check if a card is already saved
   * @deprecated Use findById instead for new code
   */
  exists(userId: string, cardUserId: string): Promise<boolean>;

  /**
   * Delete a saved card by savedCardId
   */
  deleteById(userId: string, savedCardId: string): Promise<void>;

  /**
   * Update saved card metadata by savedCardId
   */
  updateById(userId: string, savedCardId: string, data: Partial<SavedCard>): Promise<void>;

  /**
   * @deprecated Legacy method - use deleteById instead
   */
  delete(userId: string, cardUserId: string): Promise<void>;

  /**
   * @deprecated Legacy method - use updateById instead
   */
  update(userId: string, cardUserId: string, data: Partial<SavedCard>): Promise<void>;
}
