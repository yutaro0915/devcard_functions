/**
 * Validation constants for profile updates
 * These values should match the constraints in:
 * - contracts/API_CONTRACT.md
 * - contracts/openapi.yaml
 */
export const PROFILE_VALIDATION = {
  DISPLAY_NAME_MIN_LENGTH: 1,
  DISPLAY_NAME_MAX_LENGTH: 100,
  BIO_MAX_LENGTH: 500,
} as const;

/**
 * Validation constants for private card (contact information)
 */
export const PRIVATE_CARD_VALIDATION = {
  EMAIL_MAX_LENGTH: 255,
  PHONE_NUMBER_MAX_LENGTH: 50,
  LINE_ID_MAX_LENGTH: 100,
  DISCORD_ID_MAX_LENGTH: 100,
  TWITTER_HANDLE_MAX_LENGTH: 15, // Twitter公式仕様: @なしで15文字まで
  OTHER_CONTACTS_MAX_LENGTH: 500,
} as const;

/**
 * Validation constants for saved cards
 */
export const SAVED_CARD_VALIDATION = {
  LIMIT_MIN: 1,
  LIMIT_MAX: 500,
  LIMIT_DEFAULT: 100,
} as const;

/**
 * Card type constants
 * Issue #28: Centralize card type literals to avoid magic strings
 */
export const CARD_TYPE = {
  PUBLIC: "public" as const,
  PRIVATE: "private" as const,
  DEFAULT: "public" as const, // Issue #24: Default type for legacy data
} as const;

/**
 * Normalizes a Twitter handle by removing the leading @ if present
 * @param handle - Twitter handle (with or without @)
 * @returns Normalized handle without @
 */
export function normalizeTwitterHandle(handle: string): string {
  return handle.startsWith("@") ? handle.slice(1) : handle;
}

/**
 * Validates a Twitter handle format
 * - Allows optional leading @
 * - Must be 1-15 characters (excluding @)
 * - Only alphanumeric and underscore allowed
 * @param handle - Twitter handle to validate
 * @returns true if valid
 */
export function isValidTwitterHandle(handle: string): boolean {
  const normalized = normalizeTwitterHandle(handle);
  // Twitter公式仕様: 1-15文字、英数字とアンダースコアのみ
  const twitterHandleRegex = /^[A-Za-z0-9_]{1,15}$/;
  return twitterHandleRegex.test(normalized);
}

/**
 * Validation constants for badges
 */
export const BADGE_VALIDATION = {
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 50,
  DESCRIPTION_MIN_LENGTH: 1,
  DESCRIPTION_MAX_LENGTH: 500,
  PRIORITY_MIN: 0,
} as const;

/**
 * Test configuration constants
 * Issue #55, #56: Centralize magic numbers used in integration tests
 */
export const TEST_CONFIG = {
  /** Wait time for async auth trigger completion (Issue #56) */
  AUTH_TRIGGER_WAIT_MS: 2000,
  /** Maximum number of retries for async operations (Issue #55, per contract) */
  MAX_RETRIES: 3,
} as const;
