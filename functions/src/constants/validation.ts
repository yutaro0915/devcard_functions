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
  TWITTER_HANDLE_MAX_LENGTH: 100,
  OTHER_CONTACTS_MAX_LENGTH: 1000,
} as const;

/**
 * Validation constants for saved cards
 */
export const SAVED_CARD_VALIDATION = {
  LIMIT_MIN: 1,
  LIMIT_MAX: 500,
  LIMIT_DEFAULT: 100,
} as const;
