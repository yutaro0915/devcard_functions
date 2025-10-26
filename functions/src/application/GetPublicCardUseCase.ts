import {IPublicCardRepository} from "../domain/IPublicCardRepository";
import {PublicCard} from "../domain/PublicCard";

/**
 * Use case for getting a public card by userId
 * No authentication required - public cards are accessible to everyone
 */
export class GetPublicCardUseCase {
  /**
   * Create a GetPublicCardUseCase instance
   * @param {IPublicCardRepository} publicCardRepository - Repository
   */
  constructor(private publicCardRepository: IPublicCardRepository) {}

  /**
   * Get a public card by userId
   * @param {string} userId - The userId of the public card
   * @return {Promise<PublicCard | null>} The public card or null
   */
  async execute(userId: string): Promise<PublicCard | null> {
    // No authorization check - public cards are public by definition
    return await this.publicCardRepository.findByUserId(userId);
  }
}
