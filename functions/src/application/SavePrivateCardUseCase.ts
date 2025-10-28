import {IExchangeTokenRepository} from "../domain/IExchangeTokenRepository";
import {IPrivateCardRepository} from "../domain/IPrivateCardRepository";
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
    private privateCardRepository: IPrivateCardRepository,
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

    // 5. Get the PrivateCard
    const privateCard = await this.privateCardRepository.findByUserId(token.ownerId);
    if (!privateCard) {
      throw new Error("Private card not found");
    }

    // 6. Save the card
    const savedCard = await this.savedCardRepository.save({
      userId,
      cardUserId: token.ownerId,
      cardType: "private",
      lastKnownUpdatedAt: privateCard.updatedAt,
    });

    // 7. Mark token as used
    await this.exchangeTokenRepository.markAsUsed(tokenId, userId);

    return {savedCardId: savedCard.savedCardId};
  }
}
