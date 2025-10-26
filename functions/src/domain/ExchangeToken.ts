/**
 * ExchangeToken entity - temporary token for private card exchange
 * Stored in /exchange_tokens/{tokenId} collection
 * Valid for 1 minute, single-use only
 */
export interface ExchangeToken {
  tokenId: string; // Unique token ID
  ownerId: string; // User who generated this token
  createdAt: Date; // When the token was created
  expiresAt: Date; // When the token expires (createdAt + 1 minute)
  usedBy?: string; // UserId who used this token (set after first use)
  usedAt?: Date; // When the token was used
}

/**
 * Data required to create a new exchange token
 */
export interface CreateExchangeTokenData {
  tokenId: string;
  ownerId: string;
}
