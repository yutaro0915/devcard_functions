import {ICardRepository} from "../domain/ICardRepository";
import {IUserRepository} from "../domain/IUserRepository";

/**
 * Input data for updating card (all fields)
 */
export interface UpdateCardInput {
  userId: string;
  // Profile fields
  displayName?: string;
  bio?: string;
  photoURL?: string;
  backgroundImageUrl?: string;
  // Contact fields
  email?: string;
  phoneNumber?: string;
  // Messaging fields
  line?: string;
  discord?: string;
  telegram?: string;
  slack?: string;
  // Social media fields
  github?: string;
  x?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  zenn?: string;
  qiita?: string;
  website?: string;
  blog?: string;
  youtube?: string;
  twitch?: string;
  // Other
  otherContacts?: string;
  theme?: string;
  customCss?: string;
}

/**
 * Unified use case for updating card
 * Updates /cards and /users collections
 */
export class UpdateCardUseCase {
  constructor(
    private cardRepository: ICardRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(input: UpdateCardInput): Promise<void> {
    const {userId, displayName, photoURL, ...cardData} = input;

    // Update Card with all fields
    await this.cardRepository.update(userId, {
      displayName,
      photoURL,
      ...cardData,
    });

    // Update User for Firebase Auth compatibility (only displayName/photoURL)
    if (displayName !== undefined || photoURL !== undefined) {
      await this.userRepository.update(userId, {displayName, photoURL});
    }
  }
}
