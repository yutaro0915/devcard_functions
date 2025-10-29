import {IExchangeTokenRepository} from "../domain/IExchangeTokenRepository";
import {ICardRepository} from "../domain/ICardRepository";
import {ISavedCardRepository} from "../domain/ISavedCardRepository";

/**
 * Input data for saving private card via token
 */
export interface SavePrivateCardInput {
  userId: string; // User who is saving the card
  tokenId: string; // Exchange token ID
}

/**
 * Use case for saving someone else's private card using an exchange token
 * Validates token and creates SavedCard entry
 */
export class SavePrivateCardUseCase {
  constructor(
    private exchangeTokenRepository: IExchangeTokenRepository,
    private cardRepository: ICardRepository,
    private savedCardRepository: ISavedCardRepository
  ) {}

  async execute(input: SavePrivateCardInput): Promise<{savedCardId: string}> {
    const {userId, tokenId} = input;

    // 1. Get token
    const token = await this.exchangeTokenRepository.findById(tokenId);
    if (!token) {
      throw new Error("Token not found");
    }

    // 2. Validate token owner (cannot use own token)
    if (token.ownerId === userId) {
      throw new Error("Cannot use your own token");
    }

    // 3. Check if token is already used
    if (token.usedBy) {
      throw new Error("Token has already been used");
    }

    // 4. Check if token is expired (1 minute validity)
    const now = new Date();
    if (now > token.expiresAt) {
      // Issue #50: Delete expired token immediately
      await this.exchangeTokenRepository.delete(tokenId);
      throw new Error("Token has expired");
    }

    // 5. Get the Card and verify it has private contact information
    const card = await this.cardRepository.findById(token.ownerId);
    if (!card) {
      throw new Error("Card not found");
    }

    // Check if card has at least one private contact field
    const hasPrivateInfo =
      card.email ||
      card.phoneNumber ||
      card.line ||
      card.discord ||
      card.telegram ||
      card.slack;

    if (!hasPrivateInfo) {
      throw new Error("Private card not found");
    }

    // 6. Save the card
    const savedCard = await this.savedCardRepository.save({
      userId,
      cardUserId: token.ownerId,
      cardType: "private",
      lastKnownUpdatedAt: card.updatedAt,
    });

    // 7. Mark token as used
    await this.exchangeTokenRepository.markAsUsed(tokenId, userId);

    return {savedCardId: savedCard.savedCardId};
  }
}
