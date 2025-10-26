import {Firestore, DocumentData, Query, QueryDocumentSnapshot} from "firebase-admin/firestore";
import {ISavedCardRepository, FindSavedCardsOptions} from "../domain/ISavedCardRepository";
import {SavedCard, SaveCardData} from "../domain/SavedCard";

/**
 * Firestore implementation of ISavedCardRepository
 * Handles subcollection: /users/{userId}/saved_cards/{randomId}
 */
export class SavedCardRepository implements ISavedCardRepository {
  constructor(private firestore: Firestore) {}

  private getCollection(userId: string) {
    return this.firestore.collection("users").doc(userId).collection("saved_cards");
  }

  async save(data: SaveCardData): Promise<SavedCard> {
    const now = new Date();

    // Generate savedCardId if not provided
    const savedCardId = data.savedCardId || this.firestore.collection("_").doc().id;

    const savedCardData = {
      savedCardId,
      cardUserId: data.cardUserId,
      cardType: data.cardType,
      savedAt: now,
      lastKnownUpdatedAt: data.lastKnownUpdatedAt || null,
      lastViewedAt: null,
      memo: data.memo || null,
      tags: data.tags || null,
      eventId: data.eventId || null,
      badge: data.badge || null,
    };

    await this.getCollection(data.userId).doc(savedCardId).set(savedCardData);

    return this.toSavedCard(savedCardData);
  }

  async findByUserId(userId: string, options?: FindSavedCardsOptions): Promise<SavedCard[]> {
    let query: Query = this.getCollection(userId).orderBy("savedAt", "desc");

    // Apply filters
    if (options?.cardType) {
      query = query.where("cardType", "==", options.cardType);
    }
    if (options?.eventId) {
      query = query.where("eventId", "==", options.eventId);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc: QueryDocumentSnapshot) => this.toSavedCard(doc.data()));
  }

  async findById(userId: string, savedCardId: string): Promise<SavedCard | null> {
    const doc = await this.getCollection(userId).doc(savedCardId).get();

    if (!doc.exists) {
      return null;
    }

    return this.toSavedCard(doc.data()!);
  }

  async exists(userId: string, cardUserId: string): Promise<boolean> {
    // Legacy method: check by cardUserId
    const snapshot = await this.getCollection(userId)
      .where("cardUserId", "==", cardUserId)
      .limit(1)
      .get();
    return !snapshot.empty;
  }

  async deleteById(userId: string, savedCardId: string): Promise<void> {
    await this.getCollection(userId).doc(savedCardId).delete();
  }

  async updateById(userId: string, savedCardId: string, data: Partial<SavedCard>): Promise<void> {
    await this.getCollection(userId).doc(savedCardId).update(data);
  }

  // Legacy methods for backward compatibility
  async delete(userId: string, cardUserId: string): Promise<void> {
    // Find by cardUserId and delete (legacy)
    const snapshot = await this.getCollection(userId)
      .where("cardUserId", "==", cardUserId)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.delete();
    }
  }

  async update(userId: string, cardUserId: string, data: Partial<SavedCard>): Promise<void> {
    // Find by cardUserId and update (legacy)
    const snapshot = await this.getCollection(userId)
      .where("cardUserId", "==", cardUserId)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update(data);
    }
  }

  /**
   * Convert Firestore data to SavedCard entity
   */
  private toSavedCard(data: DocumentData): SavedCard {
    return {
      savedCardId: data.savedCardId,
      cardUserId: data.cardUserId,
      cardType: data.cardType,
      savedAt: data.savedAt instanceof Date ? data.savedAt : data.savedAt.toDate(),
      lastKnownUpdatedAt: data.lastKnownUpdatedAt
        ? data.lastKnownUpdatedAt instanceof Date
          ? data.lastKnownUpdatedAt
          : data.lastKnownUpdatedAt.toDate()
        : undefined,
      lastViewedAt: data.lastViewedAt
        ? data.lastViewedAt instanceof Date
          ? data.lastViewedAt
          : data.lastViewedAt.toDate()
        : undefined,
      memo: data.memo || undefined,
      tags: data.tags || undefined,
      eventId: data.eventId || undefined,
      badge: data.badge || undefined,
    };
  }
}
