import {Firestore, DocumentData, Query, QueryDocumentSnapshot} from "firebase-admin/firestore";
import {ISavedCardRepository, FindSavedCardsOptions} from "../domain/ISavedCardRepository";
import {SavedCard, SaveCardData} from "../domain/SavedCard";
import {SavedCardIdCollisionError} from "../domain/errors/DomainErrors";

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

    // Issue #21: Generate savedCardId with duplicate check
    let savedCardId = data.savedCardId;
    if (!savedCardId) {
      // Retry up to 3 times to generate a unique savedCardId
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const candidateId = this.firestore.collection("_").doc().id;
        const existingDoc = await this.getCollection(data.userId).doc(candidateId).get();

        if (!existingDoc.exists) {
          savedCardId = candidateId;
          break;
        }

        // If this was the last attempt, throw error
        if (attempt === maxRetries - 1) {
          throw new SavedCardIdCollisionError();
        }
      }
    }

    const savedCardData = {
      savedCardId: savedCardId!,
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

    // Issue #21: Use create() instead of set() to prevent overwriting existing data
    await this.getCollection(data.userId).doc(savedCardId!).create(savedCardData);

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

    // Issue #25: Implement pagination with startAfter
    if (options?.startAfter) {
      const lastDoc = await this.getCollection(userId).doc(options.startAfter).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    // Issue #25: Default limit changed from 100 to 20
    const limit = options?.limit ?? 20;
    query = query.limit(limit);

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
      // Issue #24: Default to "public" for existing data without cardType
      cardType: data.cardType || "public",
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
