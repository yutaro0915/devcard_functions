import {Firestore} from "firebase-admin/firestore";
import {IProfileUpdateTransaction} from "../application/UpdateProfileUseCase";
import {UserNotFoundError, PublicCardNotFoundError} from "../domain/errors/DomainErrors";

/**
 * Firestore implementation of profile update transaction
 * Executes atomic updates across /users, /public_cards, and optionally /private_cards collections
 */
export class ProfileUpdateTransaction implements IProfileUpdateTransaction {
  constructor(private firestore: Firestore) {}

  async execute(
    userId: string,
    userUpdate: {displayName?: string; photoURL?: string},
    publicCardUpdate: {displayName?: string; bio?: string; photoURL?: string},
    privateCardUpdate?: {displayName?: string; photoURL?: string}
  ): Promise<void> {
    await this.firestore.runTransaction(async (transaction) => {
      // Get references to documents
      const userRef = this.firestore.collection("users").doc(userId);
      const publicCardRef = this.firestore.collection("public_cards").doc(userId);
      const privateCardRef = this.firestore.collection("private_cards").doc(userId);

      // Read documents to verify they exist
      const [userDoc, publicCardDoc, privateCardDoc] = await Promise.all([
        transaction.get(userRef),
        transaction.get(publicCardRef),
        transaction.get(privateCardRef),
      ]);

      if (!userDoc.exists) {
        throw new UserNotFoundError(userId);
      }
      if (!publicCardDoc.exists) {
        throw new PublicCardNotFoundError(userId);
      }

      // Prepare update data with updatedAt
      const timestamp = new Date();
      const userUpdateWithTimestamp = {...userUpdate, updatedAt: timestamp};
      const publicCardUpdateWithTimestamp = {
        ...publicCardUpdate,
        updatedAt: timestamp,
      };

      // Execute updates in the transaction
      transaction.update(userRef, userUpdateWithTimestamp);
      transaction.update(publicCardRef, publicCardUpdateWithTimestamp);

      // Update PrivateCard if it exists and updates are provided
      if (privateCardDoc.exists && privateCardUpdate && Object.keys(privateCardUpdate).length > 0) {
        const privateCardUpdateWithTimestamp = {
          ...privateCardUpdate,
          updatedAt: timestamp,
        };
        transaction.update(privateCardRef, privateCardUpdateWithTimestamp);
      }
    });
  }
}
