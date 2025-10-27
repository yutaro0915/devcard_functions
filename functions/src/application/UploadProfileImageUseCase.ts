import {IUserRepository} from "../domain/IUserRepository";
import {IPublicCardRepository} from "../domain/IPublicCardRepository";
import {IPrivateCardRepository} from "../domain/IPrivateCardRepository";
import {StorageService} from "../infrastructure/StorageService";
import {UserNotFoundError, PublicCardNotFoundError} from "../domain/errors/DomainErrors";

export interface UploadProfileImageInput {
  userId: string;
  imageData: string; // Base64 encoded
  contentType: string;
}

export interface UploadProfileImageOutput {
  photoURL: string;
}

/**
 * UseCase for uploading user profile image to Firebase Storage
 * Updates photoURL in /users, /public_cards, and /private_cards (if exists)
 */
export class UploadProfileImageUseCase {
  constructor(
    private storageService: StorageService,
    private userRepository: IUserRepository,
    private publicCardRepository: IPublicCardRepository,
    private privateCardRepository: IPrivateCardRepository
  ) {}

  async execute(input: UploadProfileImageInput): Promise<UploadProfileImageOutput> {
    // Verify user exists
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    // Verify public card exists
    const publicCard = await this.publicCardRepository.findByUserId(input.userId);
    if (!publicCard) {
      throw new PublicCardNotFoundError(input.userId);
    }

    // Upload image to Storage
    const photoURL = await this.storageService.uploadImage(
      input.userId,
      "profile",
      input.imageData,
      input.contentType
    );

    // Update /users
    await this.userRepository.update(input.userId, {photoURL});

    // Update /public_cards
    await this.publicCardRepository.update(input.userId, {photoURL});

    // Update /private_cards (if exists)
    const privateCard = await this.privateCardRepository.findByUserId(input.userId);
    if (privateCard) {
      await this.privateCardRepository.update(input.userId, {photoURL});
    }

    return {photoURL};
  }
}
