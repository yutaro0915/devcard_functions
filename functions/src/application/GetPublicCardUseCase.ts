import {IPublicCardRepository} from "../domain/IPublicCardRepository";
import {IBadgeRepository} from "../domain/IBadgeRepository";
import {PublicCard} from "../domain/PublicCard";

/**
 * Use case for getting a public card by userId
 * No authentication required - public cards are accessible to everyone
 */
export class GetPublicCardUseCase {
  /**
   * Create a GetPublicCardUseCase instance
   * @param {IPublicCardRepository} publicCardRepository - Repository
   * @param {IBadgeRepository} badgeRepository - Badge repository (optional)
   */
  constructor(
    private publicCardRepository: IPublicCardRepository,
    private badgeRepository?: IBadgeRepository
  ) {}

  /**
   * Get a public card by userId
   * @param {string} userId - The userId of the public card
   * @return {Promise<PublicCard | null>} The public card or null
   */
  async execute(userId: string): Promise<PublicCard | null> {
    // No authorization check - public cards are public by definition
    const publicCard = await this.publicCardRepository.findByUserId(userId);

    if (!publicCard) {
      return null;
    }

    // Add badges if badgeRepository is provided
    if (this.badgeRepository) {
      const badgeIds = await this.badgeRepository.getBadgeIdsForPublicCard(userId);
      publicCard.badges = badgeIds.length > 0 ? badgeIds : undefined;
    }

    return publicCard;
  }
}
