/**
 * Custom domain error classes for better error handling
 * Replaces string-based error message matching with instanceof checks
 */

/**
 * Base class for all domain errors
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when a user is not found
 */
export class UserNotFoundError extends DomainError {
  constructor(public readonly userId: string) {
    super(`User ${userId} not found`);
  }
}

/**
 * Thrown when a public card is not found
 */
export class PublicCardNotFoundError extends DomainError {
  constructor(public readonly userId: string) {
    super(`PublicCard for user ${userId} not found`);
  }
}

/**
 * Thrown when a private card is not found
 */
export class PrivateCardNotFoundError extends DomainError {
  constructor(public readonly userId: string) {
    super(`PrivateCard for user ${userId} not found`);
  }
}

/**
 * Thrown when a saved card is not found
 */
export class SavedCardNotFoundError extends DomainError {
  constructor(public readonly savedCardId: string) {
    super(`SavedCard ${savedCardId} not found`);
  }
}

/**
 * Thrown when an exchange token is not found
 */
export class ExchangeTokenNotFoundError extends DomainError {
  constructor(public readonly tokenId: string) {
    super(`ExchangeToken ${tokenId} not found`);
  }
}

/**
 * Thrown when savedCardId generation fails due to repeated collisions
 */
export class SavedCardIdCollisionError extends DomainError {
  constructor() {
    super("Failed to generate unique savedCardId after multiple retries");
  }
}

/**
 * Badge not found error
 */
export class BadgeNotFoundError extends DomainError {
  constructor(public readonly badgeId: string) {
    super(`Badge ${badgeId} not found`);
  }
}

/**
 * Unauthorized moderator error
 */
export class UnauthorizedModeratorError extends DomainError {
  constructor(public readonly userId: string) {
    super(`User ${userId} is not authorized to perform moderator actions`);
  }
}

/**
 * Badge already granted error
 */
export class BadgeAlreadyGrantedError extends DomainError {
  constructor(
    public readonly userId: string,
    public readonly badgeId: string
  ) {
    super(`Badge ${badgeId} has already been granted to user ${userId}`);
  }
}
