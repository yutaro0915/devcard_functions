import {PublicCard, CreatePublicCardData} from "./PublicCard";

/**
 * PublicCard repository interface
 * Infrastructure layer will implement this interface
 */
export interface IPublicCardRepository {
  /**
   * Create a new public card
   */
  create(data: CreatePublicCardData): Promise<PublicCard>;

  /**
   * Find a public card by user ID
   */
  findByUserId(userId: string): Promise<PublicCard | null>;

  /**
   * Update a public card
   */
  update(userId: string, data: Partial<PublicCard>): Promise<void>;

  /**
   * Delete a public card
   */
  delete(userId: string): Promise<void>;
}
