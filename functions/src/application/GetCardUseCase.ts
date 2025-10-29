import {ICardRepository} from "../domain/ICardRepository";
import {IBadgeRepository} from "../domain/IBadgeRepository";
import {Card} from "../domain/Card";
import {CardVisibilityFilter} from "../domain/CardVisibilityFilter";

export interface GetCardInput {
  userId: string;
  visibility: "public" | "private";
  requestingUserId?: string; // For authorization
}

/**
 * Use case for getting a card with visibility filtering
 * Replaces GetPublicCardUseCase and GetPrivateCardUseCase
 */
export class GetCardUseCase {
  constructor(
    private cardRepository: ICardRepository,
    private badgeRepository?: IBadgeRepository
  ) {}

  async execute(input: GetCardInput): Promise<Partial<Card> | null> {
    const card = await this.cardRepository.findById(input.userId);

    if (!card) {
      return null;
    }

    // Authorization check for private view
    if (input.visibility === "private") {
      if (input.requestingUserId !== input.userId) {
        throw new Error("Unauthorized: Cannot access private card of another user");
      }
    }

    // Add badges if badgeRepository is provided
    if (this.badgeRepository) {
      const badgeIds =
        input.visibility === "public"
          ? await this.badgeRepository.getBadgeIdsForPublicCard(input.userId)
          : await this.badgeRepository.getBadgeIdsForPrivateCard(input.userId);

      if (badgeIds.length > 0) {
        card.badges = badgeIds;
      }
    }

    // Apply visibility filter
    if (input.visibility === "private") {
      return CardVisibilityFilter.filterPrivate(card);
    }

    return CardVisibilityFilter.filterPublic(card);
  }
}
