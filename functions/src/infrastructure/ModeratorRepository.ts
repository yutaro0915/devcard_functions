import {Firestore} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";
import {Moderator, AddModeratorData} from "../domain/Moderator";
import {IModeratorRepository} from "../domain/IModeratorRepository";

export class ModeratorRepository implements IModeratorRepository {
  constructor(private firestore: Firestore) {}

  /**
   * Add a new moderator
   */
  async addModerator(data: AddModeratorData): Promise<Moderator> {
    const now = new Date();

    const moderator: Moderator = {
      userId: data.userId,
      role: data.role,
      permissions: data.permissions,
      createdAt: now,
    };

    // Save to Firestore
    await this.firestore.collection("moderators").doc(data.userId).set({
      userId: moderator.userId,
      role: moderator.role,
      permissions: moderator.permissions,
      createdAt: now,
    });

    // Set Custom Claims
    await this.setCustomClaims(data.userId, {
      moderator: true,
      admin: data.role === "admin",
    });

    return moderator;
  }

  /**
   * Find a moderator by userId
   */
  async findById(userId: string): Promise<Moderator | null> {
    const doc = await this.firestore.collection("moderators").doc(userId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data()!;
    return {
      userId: data.userId,
      role: data.role,
      permissions: data.permissions,
      createdAt: data.createdAt.toDate(),
    };
  }

  /**
   * Check if a user is a moderator or admin
   */
  async isModerator(userId: string): Promise<boolean> {
    const moderator = await this.findById(userId);
    return moderator !== null;
  }

  /**
   * Set Custom Claims for a user
   */
  async setCustomClaims(
    userId: string,
    claims: {moderator?: boolean; admin?: boolean}
  ): Promise<void> {
    const auth = getAuth();
    await auth.setCustomUserClaims(userId, claims);
  }
}
