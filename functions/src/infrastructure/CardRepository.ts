import {Firestore, FieldValue} from "firebase-admin/firestore";
import {Card, CreateCardData, UpdateCardData} from "../domain/Card";
import {ICardRepository} from "../domain/ICardRepository";

export class CardRepository implements ICardRepository {
  private readonly collection = "cards";

  constructor(private firestore: Firestore) {}

  async create(data: CreateCardData): Promise<Card> {
    const card: Partial<Card> = {
      userId: data.userId,
      displayName: data.displayName,
      connectedServices: {},
      theme: data.theme || "default",
      visibility: {
        bio: "public",
        backgroundImage: "public",
        badges: "public",
      },
      updatedAt: new Date(),
    };

    // Only include optional fields if they are defined
    if (data.photoURL !== undefined) card.photoURL = data.photoURL;
    if (data.bio !== undefined) card.bio = data.bio;

    await this.firestore.collection(this.collection).doc(data.userId).set(card);
    return card as Card;
  }

  async findById(userId: string): Promise<Card | null> {
    const doc = await this.firestore.collection(this.collection).doc(userId).get();

    if (!doc.exists) {
      return null;
    }

    return this.mapToCard(doc.data()!);
  }

  async update(userId: string, data: UpdateCardData): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    // Handle top-level fields
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.photoURL !== undefined) updateData.photoURL = data.photoURL;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.backgroundImageUrl !== undefined)
      updateData.backgroundImageUrl = data.backgroundImageUrl;
    if (data.connectedServices !== undefined) updateData.connectedServices = data.connectedServices;
    if (data.theme !== undefined) updateData.theme = data.theme;
    if (data.customCss !== undefined) updateData.customCss = data.customCss;
    if (data.badges !== undefined) updateData.badges = data.badges;
    if (data.visibility !== undefined) updateData.visibility = data.visibility;

    // Handle privateContacts with dot notation for partial updates
    if (data.privateContacts !== undefined) {
      const contacts = data.privateContacts;
      if (contacts.email !== undefined) updateData["privateContacts.email"] = contacts.email;
      if (contacts.phoneNumber !== undefined)
        updateData["privateContacts.phoneNumber"] = contacts.phoneNumber;
      if (contacts.lineId !== undefined) updateData["privateContacts.lineId"] = contacts.lineId;
      if (contacts.discordId !== undefined)
        updateData["privateContacts.discordId"] = contacts.discordId;
      if (contacts.twitterHandle !== undefined) {
        // Empty string means delete the field
        if (contacts.twitterHandle === "") {
          updateData["privateContacts.twitterHandle"] = FieldValue.delete();
        } else {
          updateData["privateContacts.twitterHandle"] = contacts.twitterHandle;
        }
      }
      if (contacts.otherContacts !== undefined)
        updateData["privateContacts.otherContacts"] = contacts.otherContacts;
    }

    // Check if document exists before updating
    const docRef = this.firestore.collection(this.collection).doc(userId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error(`Card not found for user ${userId}`);
    }

    await docRef.update(updateData);
  }

  async delete(userId: string): Promise<void> {
    await this.firestore.collection(this.collection).doc(userId).update({
      isDeleted: true,
      updatedAt: new Date(),
    });
  }

  async exists(userId: string): Promise<boolean> {
    const doc = await this.firestore.collection(this.collection).doc(userId).get();
    return doc.exists && !doc.data()?.isDeleted;
  }

  /**
   * Map Firestore document data to Card entity
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToCard(data: any): Card {
    return {
      userId: data.userId,
      displayName: data.displayName,
      photoURL: data.photoURL,
      bio: data.bio,
      backgroundImageUrl: data.backgroundImageUrl,
      connectedServices: data.connectedServices || {},
      theme: data.theme || "default",
      customCss: data.customCss,
      badges: data.badges,
      privateContacts: data.privateContacts,
      visibility: data.visibility || {
        bio: "public",
        backgroundImage: "public",
        badges: "public",
      },
      updatedAt: data.updatedAt?.toDate() || new Date(),
      isDeleted: data.isDeleted,
    };
  }
}
