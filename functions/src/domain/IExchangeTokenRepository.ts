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
}
