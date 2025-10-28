import {ExchangeToken, CreateExchangeTokenData} from "./ExchangeToken";

/**
 * ExchangeToken repository interface
 * Infrastructure layer will implement this interface
 */
export interface IExchangeTokenRepository {
  /**
   * Create a new exchange token
   */
  create(data: CreateExchangeTokenData): Promise<ExchangeToken>;

  /**
   * Find a token by ID
   */
  findById(tokenId: string): Promise<ExchangeToken | null>;

  /**
   * Mark token as used
   */
  markAsUsed(tokenId: string, usedBy: string): Promise<void>;

  /**
   * Delete expired tokens (cleanup)
   */
  deleteExpired(): Promise<void>;

  /**
   * Delete a single token by ID
   * Issue #50: Used for immediate cleanup on expiration
   */
  delete(tokenId: string): Promise<void>;

  /**
   * Delete all unused tokens owned by a specific user
   * Issue #50: Used for token refresh functionality
   * @param ownerId - The owner user ID
   */
  deleteUnusedByOwnerId(ownerId: string): Promise<void>;
}
