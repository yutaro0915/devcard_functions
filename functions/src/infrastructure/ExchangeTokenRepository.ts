import {Firestore, FieldValue, DocumentData} from "firebase-admin/firestore";
import {IExchangeTokenRepository} from "../domain/IExchangeTokenRepository";
import {ExchangeToken, CreateExchangeTokenData} from "../domain/ExchangeToken";

/**
 * Firestore implementation of IExchangeTokenRepository
 * Handles data conversion between Firestore and Domain entities
 */
export class ExchangeTokenRepository implements IExchangeTokenRepository {
  private collection = "exchange_tokens";

  constructor(private firestore: Firestore) {}

  async create(data: CreateExchangeTokenData): Promise<ExchangeToken> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 1000); // 1 minute from now

    const tokenData = {
      tokenId: data.tokenId,
      ownerId: data.ownerId,
      createdAt: now,
      expiresAt,
    };

    await this.firestore.collection(this.collection).doc(data.tokenId).set(tokenData);

    return this.toExchangeToken(tokenData);
  }

  async findById(tokenId: string): Promise<ExchangeToken | null> {
    const doc = await this.firestore.collection(this.collection).doc(tokenId).get();

    if (!doc.exists) {
      return null;
    }

    return this.toExchangeToken(doc.data()!);
  }

  async markAsUsed(tokenId: string, usedBy: string): Promise<void> {
    await this.firestore.collection(this.collection).doc(tokenId).update({
      usedBy,
      usedAt: FieldValue.serverTimestamp(),
    });
  }

  async deleteExpired(): Promise<void> {
    const now = new Date();
    const expiredTokens = await this.firestore
      .collection(this.collection)
      .where("expiresAt", "<", now)
      .get();

    const batch = this.firestore.batch();
    expiredTokens.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }

  /**
   * Convert Firestore data to ExchangeToken entity
   */
  private toExchangeToken(data: DocumentData): ExchangeToken {
    return {
      tokenId: data.tokenId,
      ownerId: data.ownerId,
      createdAt: data.createdAt instanceof Date ? data.createdAt : data.createdAt.toDate(),
      expiresAt: data.expiresAt instanceof Date ? data.expiresAt : data.expiresAt.toDate(),
      usedBy: data.usedBy || undefined,
      usedAt: data.usedAt
        ? data.usedAt instanceof Date
          ? data.usedAt
          : data.usedAt.toDate()
        : undefined,
    };
  }
}
