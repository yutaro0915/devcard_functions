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
  /**
   * Constructor
   * @param {IUserRepository} userRepository - User repository
   * @param {IPublicCardRepository} publicCardRepository - PublicCard repo
   */
  constructor(
    private userRepository: IUserRepository,
    private publicCardRepository: IPublicCardRepository
  ) {}

  /**
   * Execute the use case
   * @param {UpdateProfileInput} input - Update input data
   * @return {Promise<void>} Promise that resolves when update is complete
   */
  async execute(input: UpdateProfileInput): Promise<void> {
    const {userId, displayName, bio, photoURL} = input;

    // Validate that at least one field is provided
    if (displayName === undefined && bio === undefined && photoURL === undefined) {
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

    // Prepare update data for User
    const userUpdateData: {displayName?: string; photoURL?: string} = {};
    if (displayName !== undefined) {
      userUpdateData.displayName = displayName;
    }
    if (photoURL !== undefined) {
      userUpdateData.photoURL = photoURL;
    }

    // Prepare update data for PublicCard
    const publicCardUpdateData: {
      displayName?: string;
      bio?: string;
      photoURL?: string;
    } = {};
    if (displayName !== undefined) {
      publicCardUpdateData.displayName = displayName;
    }
    if (bio !== undefined) {
      publicCardUpdateData.bio = bio;
    }
    if (photoURL !== undefined) {
      publicCardUpdateData.photoURL = photoURL;
    }

    // Update both collections sequentially to maintain consistency
    // Always update both to ensure updatedAt is refreshed in both collections
    try {
      await this.userRepository.update(userId, userUpdateData);
      await this.publicCardRepository.update(userId, publicCardUpdateData);
    } catch (error) {
      // If either update fails, throw a descriptive error
      // Note: Firestore updates are atomic per document, so partial failure
      // will leave one collection updated. Consider using Firestore transactions
      // for true atomicity across multiple documents in future iterations.
      throw new Error(
        `Failed to update profile: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
