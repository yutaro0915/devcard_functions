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
      theme: data.theme || "default",
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

    // All fields are flat, just check undefined
    const fields: (keyof UpdateCardData)[] = [
      "displayName",
      "photoURL",
      "bio",
      "backgroundImageUrl",
      "email",
      "phoneNumber",
      "github",
      "x",
      "linkedin",
      "instagram",
      "facebook",
      "zenn",
      "qiita",
      "line",
      "discord",
      "telegram",
      "slack",
      "website",
      "blog",
      "youtube",
      "twitch",
      "otherContacts",
      "theme",
      "customCss",
      "badges",
      "visibility",
    ];

    // Fields that should delete when set to empty string (contact fields)
    const deleteOnEmptyFields: (keyof UpdateCardData)[] = [
      "email",
      "phoneNumber",
      "github",
      "x",
      "linkedin",
      "instagram",
      "facebook",
      "zenn",
      "qiita",
      "line",
      "discord",
      "telegram",
      "slack",
      "website",
      "blog",
      "youtube",
      "twitch",
      "otherContacts",
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        // Empty strings should delete the field for contact fields
        if (data[field] === "" && deleteOnEmptyFields.includes(field as keyof UpdateCardData)) {
          updateData[field] = FieldValue.delete();
        } else {
          updateData[field] = data[field];
        }
      }
    }

    // Firestore update() will throw an error if document doesn't exist
    try {
      await this.firestore.collection(this.collection).doc(userId).update(updateData);
    } catch (error: unknown) {
      // Convert Firestore "document not found" error to domain error
      if (error instanceof Error && error.message.includes("NOT_FOUND")) {
        throw new Error(`Card not found for user ${userId}`);
      }
      throw error;
    }
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
      email: data.email,
      phoneNumber: data.phoneNumber,
      github: data.github,
      x: data.x,
      linkedin: data.linkedin,
      instagram: data.instagram,
      facebook: data.facebook,
      zenn: data.zenn,
      qiita: data.qiita,
      line: data.line,
      discord: data.discord,
      telegram: data.telegram,
      slack: data.slack,
      website: data.website,
      blog: data.blog,
      youtube: data.youtube,
      twitch: data.twitch,
      otherContacts: data.otherContacts,
      theme: data.theme || "default",
      customCss: data.customCss,
      badges: data.badges,
      visibility: data.visibility,
      updatedAt: data.updatedAt?.toDate() || new Date(),
      isDeleted: data.isDeleted,
    };
  }
}
