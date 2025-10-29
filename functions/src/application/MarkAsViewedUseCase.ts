import {ISavedCardRepository} from "../domain/ISavedCardRepository";
import {ICardRepository} from "../domain/ICardRepository";

/**
 * Input data for marking card as viewed
 */
export interface MarkAsViewedInput {
  userId: string;
  savedCardId: string;
}

/**
 * Use case for marking a saved card as viewed
 * Updates lastViewedAt and lastKnownUpdatedAt
 */
export class MarkAsViewedUseCase {
  constructor(
    private savedCardRepository: ISavedCardRepository,
    private cardRepository: ICardRepository
  ) {}

  async execute(input: MarkAsViewedInput): Promise<void> {
    const {userId, savedCardId} = input;

    // Get the SavedCard
    const savedCard = await this.savedCardRepository.findById(userId, savedCardId);
    if (!savedCard) {
      throw new Error("Saved card not found");
    }

    // Get the master card's current updatedAt
    const card = await this.cardRepository.findById(savedCard.cardUserId);
    if (!card) {
      throw new Error("Card not found");
    }

    // Update lastViewedAt and lastKnownUpdatedAt
    const now = new Date();
    await this.savedCardRepository.updateById(userId, savedCardId, {
      lastViewedAt: now,
      lastKnownUpdatedAt: card.updatedAt,
    });
  }
}
