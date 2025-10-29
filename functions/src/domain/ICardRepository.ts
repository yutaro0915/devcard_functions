import {Card, CreateCardData, UpdateCardData} from "./Card";

export interface ICardRepository {
  /**
   * Create a new card
   */
  create(data: CreateCardData): Promise<Card>;

  /**
   * Find a card by userId
   */
  findById(userId: string): Promise<Card | null>;

  /**
   * Update a card (partial update)
   */
  update(userId: string, data: UpdateCardData): Promise<void>;

  /**
   * Delete a card (soft delete)
   */
  delete(userId: string): Promise<void>;

  /**
   * Check if a card exists
   */
  exists(userId: string): Promise<boolean>;
}
