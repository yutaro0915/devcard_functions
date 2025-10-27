import {IPrivateCardRepository} from "../domain/IPrivateCardRepository";
import {IBadgeRepository} from "../domain/IBadgeRepository";
import {PrivateCard} from "../domain/PrivateCard";

/**
 * Use case for getting user's own private card
 */
export class GetPrivateCardUseCase {
  constructor(
    private privateCardRepository: IPrivateCardRepository,
    private badgeRepository?: IBadgeRepository
  ) {}

  async execute(userId: string): Promise<PrivateCard | null> {
    const privateCard = await this.privateCardRepository.findByUserId(userId);

    if (!privateCard) {
      return null;
    }

    // Add badges if badgeRepository is provided
    if (this.badgeRepository) {
      const badgeIds = await this.badgeRepository.getBadgeIdsForPrivateCard(userId);
      privateCard.badges = badgeIds.length > 0 ? badgeIds : undefined;
    }

    return privateCard;
  }
}
