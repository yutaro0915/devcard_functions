import {Firestore} from "firebase-admin/firestore";
import {ISavedCardRepository} from "../domain/ISavedCardRepository";
import {SavedCard, SaveCardData} from "../domain/SavedCard";

/**
 * Firestore implementation of ISavedCardRepository
 * Handles subcollection: /users/{userId}/saved_cards/{cardUserId}
 */
export class SavedCardRepository implements ISavedCardRepository {
  constructor(private firestore: Firestore) {}

  private getCollection(userId: string) {
    return this.firestore.collection("users").doc(userId).collection("saved_cards");
  }

  async save(data: SaveCardData): Promise<SavedCard> {
    const now = new Date();
    const savedCardData = {
      cardUserId: data.cardUserId,
      savedAt: now,
      memo: data.memo || null,
      tags: data.tags || null,
      eventId: data.eventId || null,
      badge: data.badge || null,
    };

    await this.getCollection(data.userId).doc(data.cardUserId).set(savedCardData);

    return this.toSavedCard(savedCardData);
  }

  async findByUserId(userId: string): Promise<SavedCard[]> {
    const snapshot = await this.getCollection(userId).orderBy("savedAt", "desc").get();

    return snapshot.docs.map((doc) => this.toSavedCard(doc.data()));
  }

  async exists(userId: string, cardUserId: string): Promise<boolean> {
    const doc = await this.getCollection(userId).doc(cardUserId).get();
    return doc.exists;
  }

  async delete(userId: string, cardUserId: string): Promise<void> {
    await this.getCollection(userId).doc(cardUserId).delete();
  }

  async update(userId: string, cardUserId: string, data: Partial<SavedCard>): Promise<void> {
    await this.getCollection(userId).doc(cardUserId).update(data);
  }

  /**
   * Convert Firestore data to SavedCard entity
   */
  private toSavedCard(data: any): SavedCard {
    return {
      cardUserId: data.cardUserId,
      savedAt: data.savedAt instanceof Date ? data.savedAt : data.savedAt.toDate(),
      memo: data.memo || undefined,
      tags: data.tags || undefined,
      eventId: data.eventId || undefined,
      badge: data.badge || undefined,
    };
  }
}
