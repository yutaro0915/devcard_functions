import {ISavedCardRepository} from "../domain/ISavedCardRepository";
import {IPublicCardRepository} from "../domain/IPublicCardRepository";
import {IPrivateCardRepository} from "../domain/IPrivateCardRepository";

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
    private publicCardRepository: IPublicCardRepository,
    private privateCardRepository: IPrivateCardRepository
  ) {}

  async execute(input: MarkAsViewedInput): Promise<void> {
    const {userId, savedCardId} = input;

    // Get the SavedCard
    const savedCard = await this.savedCardRepository.findById(userId, savedCardId);
    if (!savedCard) {
      throw new Error("Saved card not found");
    }

    // Get the master card's current updatedAt
    let masterUpdatedAt: Date;

    if (savedCard.cardType === "public") {
      const publicCard = await this.publicCardRepository.findByUserId(savedCard.cardUserId);
      if (!publicCard) {
        throw new Error("Public card not found");
      }
      masterUpdatedAt = publicCard.updatedAt;
    } else {
      // private
      const privateCard = await this.privateCardRepository.findByUserId(savedCard.cardUserId);
      if (!privateCard) {
        throw new Error("Private card not found");
      }
      masterUpdatedAt = privateCard.updatedAt;
    }

    // Update lastViewedAt and lastKnownUpdatedAt
    const now = new Date();
    await this.savedCardRepository.updateById(userId, savedCardId, {
      lastViewedAt: now,
      lastKnownUpdatedAt: masterUpdatedAt,
    });
  }
}
