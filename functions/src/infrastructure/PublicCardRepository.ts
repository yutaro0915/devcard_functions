import {Firestore, FieldValue, DocumentData} from "firebase-admin/firestore";
import {IPublicCardRepository} from "../domain/IPublicCardRepository";
import {PublicCard, CreatePublicCardData} from "../domain/PublicCard";

/**
 * Firestore implementation of IPublicCardRepository
 * Handles data conversion between Firestore and Domain entities
 */
export class PublicCardRepository implements IPublicCardRepository {
  private collection = "public_cards";

  constructor(private firestore: Firestore) {}

  async create(data: CreatePublicCardData): Promise<PublicCard> {
    const now = new Date();
    const publicCardData = {
      userId: data.userId,
      displayName: data.displayName,
      photoURL: data.photoURL || null,
      bio: data.bio || null,
      connectedServices: {},
      theme: data.theme || "default",
      customCss: null,
      updatedAt: now,
    };

    await this.firestore.collection(this.collection).doc(data.userId).set(publicCardData);

    return this.toPublicCard(publicCardData);
  }

  async findByUserId(userId: string): Promise<PublicCard | null> {
    const doc = await this.firestore.collection(this.collection).doc(userId).get();

    if (!doc.exists) {
      return null;
    }

    return this.toPublicCard(doc.data()!);
  }

  async update(userId: string, data: Partial<PublicCard>): Promise<void> {
    const updateData = {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await this.firestore.collection(this.collection).doc(userId).update(updateData);
  }

  async delete(userId: string): Promise<void> {
    await this.firestore.collection(this.collection).doc(userId).delete();
  }

  /**
   * Convert Firestore data to PublicCard entity
   */
  private toPublicCard(data: DocumentData): PublicCard {
    return {
      userId: data.userId,
      displayName: data.displayName,
      photoURL: data.photoURL || undefined,
      bio: data.bio || undefined,
      connectedServices: data.connectedServices || {},
      theme: data.theme || "default",
      customCss: data.customCss || undefined,
      backgroundImageUrl: data.backgroundImageUrl || undefined,
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt : data.updatedAt.toDate(),
    };
  }
}
