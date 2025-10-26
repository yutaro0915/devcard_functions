import {Firestore, FieldValue, DocumentData} from "firebase-admin/firestore";
import {IPrivateCardRepository} from "../domain/IPrivateCardRepository";
import {PrivateCard, CreatePrivateCardData} from "../domain/PrivateCard";

/**
 * Firestore implementation of IPrivateCardRepository
 * Handles data conversion between Firestore and Domain entities
 */
export class PrivateCardRepository implements IPrivateCardRepository {
  private collection = "private_cards";

  constructor(private firestore: Firestore) {}

  async create(data: CreatePrivateCardData): Promise<PrivateCard> {
    const now = new Date();
    const privateCardData = {
      userId: data.userId,
      displayName: data.displayName,
      photoURL: data.photoURL || null,
      email: data.email || null,
      phoneNumber: data.phoneNumber || null,
      lineId: data.lineId || null,
      discordId: data.discordId || null,
      twitterHandle: data.twitterHandle || null,
      otherContacts: data.otherContacts || null,
      updatedAt: now,
      isDeleted: false,
    };

    await this.firestore.collection(this.collection).doc(data.userId).set(privateCardData);

    return this.toPrivateCard(privateCardData);
  }

  async findByUserId(userId: string): Promise<PrivateCard | null> {
    const doc = await this.firestore.collection(this.collection).doc(userId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data()!;

    // Return null if soft deleted
    if (data.isDeleted === true) {
      return null;
    }

    return this.toPrivateCard(data);
  }

  async update(userId: string, data: Partial<PrivateCard>): Promise<void> {
    const updateData = {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await this.firestore.collection(this.collection).doc(userId).update(updateData);
  }

  async delete(userId: string): Promise<void> {
    // Soft delete
    await this.firestore.collection(this.collection).doc(userId).update({
      isDeleted: true,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  /**
   * Convert Firestore data to PrivateCard entity
   */
  private toPrivateCard(data: DocumentData): PrivateCard {
    return {
      userId: data.userId,
      displayName: data.displayName,
      photoURL: data.photoURL || undefined,
      email: data.email || undefined,
      phoneNumber: data.phoneNumber || undefined,
      lineId: data.lineId || undefined,
      discordId: data.discordId || undefined,
      twitterHandle: data.twitterHandle || undefined,
      otherContacts: data.otherContacts || undefined,
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt : data.updatedAt.toDate(),
      isDeleted: data.isDeleted || undefined,
    };
  }
}
