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
}
