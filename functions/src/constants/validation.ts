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
