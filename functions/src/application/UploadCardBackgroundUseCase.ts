import {ICardRepository} from "../domain/ICardRepository";
import {StorageService} from "../infrastructure/StorageService";

export interface UploadCardBackgroundInput {
  userId: string;
  imageData: string; // Base64 encoded
  contentType: string;
}

export interface UploadCardBackgroundOutput {
  backgroundImageUrl: string;
}

/**
 * UseCase for uploading card background image to Firebase Storage
 * Updates backgroundImageUrl in /cards
 */
export class UploadCardBackgroundUseCase {
  constructor(
    private storageService: StorageService,
    private cardRepository: ICardRepository
  ) {}

  async execute(input: UploadCardBackgroundInput): Promise<UploadCardBackgroundOutput> {
    // Verify card exists
    const card = await this.cardRepository.findById(input.userId);
    if (!card) {
      throw new Error(`Card not found for user ${input.userId}`);
    }

    // Upload image to Storage
    const backgroundImageUrl = await this.storageService.uploadImage(
      input.userId,
      "card_background",
      input.imageData,
      input.contentType
    );

    // Update /cards
    await this.cardRepository.update(input.userId, {backgroundImageUrl});

    return {backgroundImageUrl};
  }
}
