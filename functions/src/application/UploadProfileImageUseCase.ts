import {IUserRepository} from "../domain/IUserRepository";
import {ICardRepository} from "../domain/ICardRepository";
import {StorageService} from "../infrastructure/StorageService";
import {UserNotFoundError} from "../domain/errors/DomainErrors";

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
 * Updates photoURL in /cards and /users
 */
export class UploadProfileImageUseCase {
  constructor(
    private storageService: StorageService,
    private userRepository: IUserRepository,
    private cardRepository: ICardRepository
  ) {}

  async execute(input: UploadProfileImageInput): Promise<UploadProfileImageOutput> {
    // Verify user exists
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    // Upload image to Storage
    const photoURL = await this.storageService.uploadImage(
      input.userId,
      "profile",
      input.imageData,
      input.contentType
    );

    // Update /cards
    await this.cardRepository.update(input.userId, {photoURL});

    // Update /users (for Firebase Auth compatibility)
    await this.userRepository.update(input.userId, {photoURL});

    return {photoURL};
  }
}
