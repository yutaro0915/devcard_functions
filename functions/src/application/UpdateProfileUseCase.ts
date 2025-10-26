import {IUserRepository} from "../domain/IUserRepository";
import {IPublicCardRepository} from "../domain/IPublicCardRepository";

/**
 * Input data for updating user profile
 */
export interface UpdateProfileInput {
  userId: string;
  displayName?: string;
  bio?: string;
  photoURL?: string;
}

/**
 * Use case for updating user profile
 * Updates both /users and /public_cards collections
 */
export class UpdateProfileUseCase {
  constructor(
    private userRepository: IUserRepository,
    private publicCardRepository: IPublicCardRepository
  ) {}

  async execute(input: UpdateProfileInput): Promise<void> {
    const {userId, displayName, bio, photoURL} = input;

    // Validate that at least one field is provided
    if (!displayName && !bio && photoURL === undefined) {
      throw new Error("At least one field must be provided for update");
    }

    // Check if user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Check if public card exists
    const publicCard = await this.publicCardRepository.findByUserId(userId);
    if (!publicCard) {
      throw new Error(`PublicCard for user ${userId} not found`);
    }

    // Prepare update data
    const userUpdateData: {displayName?: string; photoURL?: string} = {};
    const publicCardUpdateData: {displayName?: string; bio?: string; photoURL?: string} = {};

    if (displayName !== undefined) {
      userUpdateData.displayName = displayName;
      publicCardUpdateData.displayName = displayName;
    }

    if (photoURL !== undefined) {
      userUpdateData.photoURL = photoURL;
      publicCardUpdateData.photoURL = photoURL;
    }

    if (bio !== undefined) {
      publicCardUpdateData.bio = bio;
    }

    // Update both collections
    await Promise.all([
      this.userRepository.update(userId, userUpdateData),
      this.publicCardRepository.update(userId, publicCardUpdateData),
    ]);
  }
}
