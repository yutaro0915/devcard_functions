/**
 * Service for sanitizing user input
 * TODO: Implement actual sanitization logic when CSS customization UI is ready
 */
export class SanitizeService {
  /**
   * Sanitize custom CSS
   * @param css - Raw CSS string from user
   * @returns Sanitized CSS string
   */
  sanitizeCss(css: string): string {
    // TODO: Implement CSS sanitization
    // - Remove dangerous properties (e.g., javascript:, data:, @import)
    // - Validate selectors
    // - Limit allowed properties
    return css;
  }

  /**
   * Sanitize text content
   * @param text - Raw text from user
   * @returns Sanitized text
   */
  sanitizeText(text: string): string {
    // TODO: Implement text sanitization
    // - Remove HTML tags
    // - Escape special characters
    return text;
  }

  /**
   * Sanitize displayName from email address
   * Removes special characters that may cause issues in Firestore or UI
   * @param emailPrefix - Email prefix (before @)
   * @returns Sanitized displayName (alphanumeric only, max 100 chars)
   */
  sanitizeDisplayName(emailPrefix: string): string {
    // Remove all non-alphanumeric characters (keep only a-z, A-Z, 0-9)
    // This prevents issues with special chars like +, ., -, etc.
    const sanitized = emailPrefix.replace(/[^a-zA-Z0-9]/g, "");

    // If all characters were removed, fallback to "user"
    if (sanitized.length === 0) {
      return "user";
    }

    // Limit to 100 characters (displayName max length)
    return sanitized.substring(0, 100);
  }
}
