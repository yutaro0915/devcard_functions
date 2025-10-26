import {ISavedCardRepository} from "../domain/ISavedCardRepository";
import {IPublicCardRepository} from "../domain/IPublicCardRepository";
import {SavedCard} from "../domain/SavedCard";

/**
 * Input data for saving a card
 */
export interface SaveCardInput {
  userId: string;
  cardUserId: string;
  memo?: string;
  tags?: string[];
  eventId?: string;
  badge?: string;
}

/**
 * Use case for saving a card to user's collection
 */
export class SaveCardUseCase {
  constructor(
    private savedCardRepository: ISavedCardRepository,
    private publicCardRepository: IPublicCardRepository
  ) {}

  async execute(input: SaveCardInput): Promise<SavedCard> {
    // Verify the card exists
    const publicCard = await this.publicCardRepository.findByUserId(input.cardUserId);
    if (!publicCard) {
      throw new Error(`PublicCard ${input.cardUserId} not found`);
    }

    // Check if already saved (deprecated check - now allows multiple saves with different IDs)
    // Note: We no longer prevent duplicate saves since savedCardId is now random

    // Save the card
    const savedCard = await this.savedCardRepository.save({
      userId: input.userId,
      cardUserId: input.cardUserId,
      cardType: "public",
      lastKnownUpdatedAt: publicCard.updatedAt,
      memo: input.memo,
      tags: input.tags,
      eventId: input.eventId,
      badge: input.badge,
    });

    return savedCard;
  }
}
