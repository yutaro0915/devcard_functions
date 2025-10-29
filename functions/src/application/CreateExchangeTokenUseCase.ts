import crypto from "crypto";
import {ICardRepository} from "../domain/ICardRepository";
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
    private cardRepository: ICardRepository,
    private exchangeTokenRepository: IExchangeTokenRepository
  ) {}

  async execute(input: CreateExchangeTokenInput): Promise<CreateExchangeTokenOutput> {
    // Verify Card exists and has privateContacts
    const card = await this.cardRepository.findById(input.userId);
    if (!card || !card.privateContacts) {
      throw new PrivateCardNotFoundError(input.userId);
    }

    // Issue #50: Delete existing unused tokens before creating new one
    await this.exchangeTokenRepository.deleteUnusedByOwnerId(input.userId);

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
   * Generate a cryptographically secure random token ID
   * Issue #31: Uses crypto.randomBytes() instead of Math.random()
   * @returns 20-character Base64URL string (collision probability: ~2^-120)
   */
  private generateTokenId(): string {
    // Generate 15 bytes of random data (120 bits of entropy)
    // Base64URL encoding creates ~20 characters
    // Character set: [A-Za-z0-9_-] (URL-safe, QR code compatible)
    return crypto.randomBytes(15).toString("base64url").substring(0, 20);
  }
}
