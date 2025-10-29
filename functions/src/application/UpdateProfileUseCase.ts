import {ICardRepository} from "../domain/ICardRepository";
import {IUserRepository} from "../domain/IUserRepository";

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
 * Updates /cards and /users collections (no transaction needed)
 */
export class UpdateProfileUseCase {
  constructor(
    private cardRepository: ICardRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(input: UpdateProfileInput): Promise<void> {
    const {userId, displayName, bio, photoURL} = input;

    // Update Card (single write, no transaction needed!)
    await this.cardRepository.update(userId, {
      displayName,
      bio,
      photoURL,
    });

    // Update User (for Firebase Auth compatibility)
    if (displayName || photoURL) {
      await this.userRepository.update(userId, {displayName, photoURL});
    }
  }
}
