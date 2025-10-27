import {IPublicCardRepository} from "../domain/IPublicCardRepository";
import {StorageService} from "../infrastructure/StorageService";
import {PublicCardNotFoundError} from "../domain/errors/DomainErrors";

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
 * Updates backgroundImageUrl in /public_cards
 */
export class UploadCardBackgroundUseCase {
  constructor(
    private storageService: StorageService,
    private publicCardRepository: IPublicCardRepository
  ) {}

  async execute(input: UploadCardBackgroundInput): Promise<UploadCardBackgroundOutput> {
    // Verify public card exists
    const publicCard = await this.publicCardRepository.findByUserId(input.userId);
    if (!publicCard) {
      throw new PublicCardNotFoundError(input.userId);
    }

    // Upload image to Storage
    const backgroundImageUrl = await this.storageService.uploadImage(
      input.userId,
      "card_background",
      input.imageData,
      input.contentType
    );

    // Update /public_cards
    await this.publicCardRepository.update(input.userId, {backgroundImageUrl});

    return {backgroundImageUrl};
  }
}
