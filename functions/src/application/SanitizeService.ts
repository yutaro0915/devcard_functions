/**
 * Service for sanitizing user input
 */
export class SanitizeService {
  /**
   * Sanitize custom CSS
   * @param css - Raw CSS string from user
   * @returns Sanitized CSS string
   */
  sanitizeCss(css: string): string {
    if (!css || typeof css !== "string") {
      return "";
    }

    let sanitized = css;

    // Remove HTML tags (defense in depth)
    sanitized = sanitized.replace(/<[^>]*>/g, "");

    // Remove javascript: URLs
    sanitized = sanitized.replace(/javascript\s*:/gi, "");

    // Remove vbscript: URLs
    sanitized = sanitized.replace(/vbscript\s*:/gi, "");

    // Remove dangerous data: URLs (but keep safe image data URLs)
    // This removes data: URLs that are NOT image types
    sanitized = sanitized.replace(
      /url\s*\(\s*["']?data:(?!image\/(png|jpe?g|gif|svg\+xml|webp))[^"')]*["']?\s*\)/gi,
      ""
    );

    // Remove @import statements
    sanitized = sanitized.replace(/@import\s+/gi, "");

    // Remove expression() (old IE)
    sanitized = sanitized.replace(/expression\s*\(/gi, "");

    // Remove behavior property (old IE)
    sanitized = sanitized.replace(/behavior\s*:/gi, "");

    // Remove -moz-binding (Firefox XBL)
    sanitized = sanitized.replace(/-moz-binding\s*:/gi, "");

    // Remove unsafe url() patterns (not http/https/relative/hash/data:image)
    sanitized = sanitized.replace(
      /url\s*\(\s*["']?(?!https?:\/\/|\/\/|\/|#|data:image\/)[^"')]*["']?\s*\)/gi,
      ""
    );

    return sanitized.trim();
  }

  /**
   * Sanitize text content
   * @param text - Raw text from user
   * @returns Sanitized text
   */
  sanitizeText(text: string): string {
    if (!text || typeof text !== "string") {
      return "";
    }

    let sanitized = text;

    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, "");

    // Escape special HTML characters
    sanitized = sanitized
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");

    return sanitized.trim();
  }
}
