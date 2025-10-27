import {IPrivateCardRepository} from "../domain/IPrivateCardRepository";
import {IUserRepository} from "../domain/IUserRepository";
import {UserNotFoundError} from "../domain/errors/DomainErrors";

/**
 * Input data for updating private card
 */
export interface UpdatePrivateCardInput {
  userId: string;
  email?: string;
  phoneNumber?: string;
  lineId?: string;
  discordId?: string;
  twitterHandle?: string;
  otherContacts?: string;
}

/**
 * Use case for updating private card contact information
 * Creates PrivateCard if it doesn't exist
 */
export class UpdatePrivateCardUseCase {
  constructor(
    private privateCardRepository: IPrivateCardRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(input: UpdatePrivateCardInput): Promise<void> {
    const {userId, ...contactFields} = input;

    // Get user info for displayName and photoURL
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Filter out undefined values from contactFields
    // Keep empty strings ("") as they indicate field deletion
    const filteredContactFields = Object.fromEntries(
      Object.entries(contactFields).filter(([, value]) => value !== undefined)
    );

    // Check if PrivateCard exists
    const existingPrivateCard = await this.privateCardRepository.findByUserId(userId);

    if (existingPrivateCard) {
      // Update existing card
      await this.privateCardRepository.update(userId, {
        ...filteredContactFields,
        // Sync displayName and photoURL from User
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
    } else {
      // Create new card
      await this.privateCardRepository.create({
        userId,
        displayName: user.displayName,
        photoURL: user.photoURL,
        ...contactFields,
      });
    }
  }
}
