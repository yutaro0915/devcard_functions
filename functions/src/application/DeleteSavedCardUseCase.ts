import {ISavedCardRepository} from "../domain/ISavedCardRepository";

/**
 * Input data for deleting saved card
 */
export interface DeleteSavedCardInput {
  userId: string;
  savedCardId: string;
}

/**
 * Use case for deleting a saved card
 */
export class DeleteSavedCardUseCase {
  constructor(private savedCardRepository: ISavedCardRepository) {}

  async execute(input: DeleteSavedCardInput): Promise<void> {
    const {userId, savedCardId} = input;

    // Check if card exists
    const savedCard = await this.savedCardRepository.findById(userId, savedCardId);
    if (!savedCard) {
      throw new Error("Saved card not found");
    }

    // Delete the card
    await this.savedCardRepository.deleteById(userId, savedCardId);
  }
}
