import {PrivateCard, CreatePrivateCardData} from "./PrivateCard";

/**
 * PrivateCard repository interface
 * Infrastructure layer will implement this interface
 */
export interface IPrivateCardRepository {
  /**
   * Create a new private card
   */
  create(data: CreatePrivateCardData): Promise<PrivateCard>;

  /**
   * Find a private card by user ID
   */
  findByUserId(userId: string): Promise<PrivateCard | null>;

  /**
   * Update a private card
   */
  update(userId: string, data: Partial<PrivateCard>): Promise<void>;

  /**
   * Delete a private card (soft delete)
   */
  delete(userId: string): Promise<void>;
}
