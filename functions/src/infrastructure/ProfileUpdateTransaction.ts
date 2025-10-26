import {Firestore} from "firebase-admin/firestore";
import {IProfileUpdateTransaction} from "../application/UpdateProfileUseCase";

/**
 * Firestore implementation of profile update transaction
 * Executes atomic updates across /users and /public_cards collections
 */
export class ProfileUpdateTransaction implements IProfileUpdateTransaction {
  constructor(private firestore: Firestore) {}

  async execute(
    userId: string,
    userUpdate: {displayName?: string; photoURL?: string},
    publicCardUpdate: {displayName?: string; bio?: string; photoURL?: string}
  ): Promise<void> {
    await this.firestore.runTransaction(async (transaction) => {
      // Get references to both documents
      const userRef = this.firestore.collection("users").doc(userId);
      const publicCardRef = this.firestore.collection("public_cards").doc(userId);

      // Read both documents to verify they exist
      const [userDoc, publicCardDoc] = await Promise.all([
        transaction.get(userRef),
        transaction.get(publicCardRef),
      ]);

      if (!userDoc.exists) {
        throw new Error(`User with ID ${userId} not found`);
      }
      if (!publicCardDoc.exists) {
        throw new Error(`PublicCard for user ${userId} not found`);
      }

      // Prepare update data with updatedAt
      const timestamp = new Date();
      const userUpdateWithTimestamp = {...userUpdate, updatedAt: timestamp};
      const publicCardUpdateWithTimestamp = {
        ...publicCardUpdate,
        updatedAt: timestamp,
      };

      // Execute both updates in the transaction
      transaction.update(userRef, userUpdateWithTimestamp);
      transaction.update(publicCardRef, publicCardUpdateWithTimestamp);
    });
  }
}
