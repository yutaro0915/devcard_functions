import {IPublicCardRepository} from "../domain/IPublicCardRepository";
import {PublicCard} from "../domain/PublicCard";

/**
 * Use case for getting a public card by userId
 */
export class GetPublicCardUseCase {
  constructor(private publicCardRepository: IPublicCardRepository) {}

  async execute(userId: string): Promise<PublicCard> {
    const publicCard = await this.publicCardRepository.findByUserId(userId);

    if (!publicCard) {
      throw new Error(`PublicCard for user ${userId} not found`);
    }

    return publicCard;
  }
}
