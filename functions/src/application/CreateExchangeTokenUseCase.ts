import {IPrivateCardRepository} from "../domain/IPrivateCardRepository";
import {IExchangeTokenRepository} from "../domain/IExchangeTokenRepository";
import {PrivateCardNotFoundError} from "../domain/errors/DomainErrors";

/**
 * Input for CreateExchangeToken use case
 */
export interface CreateExchangeTokenInput {
  userId: string;
}

/**
 * Output for CreateExchangeToken use case
 */
export interface CreateExchangeTokenOutput {
  tokenId: string;
  expiresAt: string; // ISO 8601 format
  qrCodeData: string; // Format: "devcard://exchange/{tokenId}"
}

/**
 * Use case for creating an exchange token for PrivateCard sharing
 * Issue #23: Implements QR code exchange flow
 */
export class CreateExchangeTokenUseCase {
  constructor(
    private privateCardRepository: IPrivateCardRepository,
    private exchangeTokenRepository: IExchangeTokenRepository
  ) {}

  async execute(input: CreateExchangeTokenInput): Promise<CreateExchangeTokenOutput> {
    // Verify PrivateCard exists
    const privateCard = await this.privateCardRepository.findByUserId(input.userId);
    if (!privateCard) {
      throw new PrivateCardNotFoundError(input.userId);
    }

    // Generate random tokenId
    const tokenId = this.generateTokenId();

    // Create token with 1 minute expiration
    const token = await this.exchangeTokenRepository.create({
      tokenId,
      ownerId: input.userId,
    });

    return {
      tokenId: token.tokenId,
      expiresAt: token.expiresAt.toISOString(),
      qrCodeData: `devcard://exchange/${token.tokenId}`,
    };
  }

  /**
   * Generate a random token ID
   * Uses Firestore's document ID generator for consistency
   */
  private generateTokenId(): string {
    // Generate a random ID (20 characters, alphanumeric)
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 20; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
