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
 * Interface for executing profile update transactions
 * Infrastructure layer will implement this interface
 */
export interface IProfileUpdateTransaction {
  /**
   * Execute atomic update of /users, /public_cards, and optionally /private_cards
   */
  execute(
    userId: string,
    userUpdate: {displayName?: string; photoURL?: string},
    publicCardUpdate: {displayName?: string; bio?: string; photoURL?: string},
    privateCardUpdate?: {displayName?: string; photoURL?: string}
  ): Promise<void>;
}

/**
 * Use case for updating user profile
 * Updates both /users and /public_cards collections
 */
export class UpdateProfileUseCase {
  /**
   * Constructor
   * @param {IProfileUpdateTransaction} transaction - Transaction executor
   */
  constructor(private transaction: IProfileUpdateTransaction) {}

  /**
   * Execute the use case
   * @param {UpdateProfileInput} input - Update input data
   * @return {Promise<void>} Promise that resolves when update is complete
   */
  async execute(input: UpdateProfileInput): Promise<void> {
    const {userId, displayName, bio, photoURL} = input;

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

    // Prepare update data for PrivateCard (only if displayName or photoURL changed)
    let privateCardUpdateData: {displayName?: string; photoURL?: string} | undefined;
    if (displayName !== undefined || photoURL !== undefined) {
      privateCardUpdateData = {};
      if (displayName !== undefined) {
        privateCardUpdateData.displayName = displayName;
      }
      if (photoURL !== undefined) {
        privateCardUpdateData.photoURL = photoURL;
      }
    }

    // Execute atomic update via transaction interface
    await this.transaction.execute(
      userId,
      userUpdateData,
      publicCardUpdateData,
      privateCardUpdateData
    );
  }
}
