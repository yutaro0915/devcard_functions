import {ISavedCardRepository} from "../domain/ISavedCardRepository";
import {IPublicCardRepository} from "../domain/IPublicCardRepository";
import {SavedCard} from "../domain/SavedCard";
import {PublicCard} from "../domain/PublicCard";

/**
 * Combined SavedCard with PublicCard details
 */
export interface SavedCardWithDetails {
  // Metadata
  savedCard: SavedCard;
  // Full card details (fetched from /public_cards)
  publicCard: PublicCard | null; // null if card was deleted
}

/**
 * Use case for getting all saved cards with their details
 */
export class GetSavedCardsUseCase {
  constructor(
    private savedCardRepository: ISavedCardRepository,
    private publicCardRepository: IPublicCardRepository
  ) {}

  async execute(userId: string): Promise<SavedCardWithDetails[]> {
    // Get saved card metadata
    const savedCards = await this.savedCardRepository.findByUserId(userId);

    // Fetch public card details for each saved card
    const cardsWithDetails = await Promise.all(
      savedCards.map(async (savedCard) => {
        const publicCard = await this.publicCardRepository.findByUserId(savedCard.cardUserId);
        return {
          savedCard,
          publicCard,
        };
      })
    );

    return cardsWithDetails;
  }
}
