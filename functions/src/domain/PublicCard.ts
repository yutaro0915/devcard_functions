/**
 * Common protocol that all connected services must satisfy
 */
export interface ConnectedService {
  serviceName: string; // "github", "qiita", "zenn", "x"
  username: string;
  profileUrl: string;

  // Optional common fields
  avatarUrl?: string;
  bio?: string;

  // Service-specific statistics (flexible structure)
  stats?: Record<string, number | string>;
}

/**
 * PublicCard entity - publicly accessible card data
 * This data is stored in /public_cards/{userId} collection (public, read-only)
 */
export interface PublicCard {
  userId: string;

  // Basic profile
  displayName: string;
  photoURL?: string;
  bio?: string;

  // Connected services (loosely coupled, extensible)
  connectedServices: Record<string, ConnectedService>;

  // Badges
  badges?: string[]; // Badge IDs where showOnPublicCard=true

  // Customization
  theme: string; // e.g., "default", "dark", "minimal"
  customCss?: string; // sanitized
  backgroundImageUrl?: string; // Background image URL from Firebase Storage

  // Metadata
  updatedAt: Date;
}

/**
 * Data required to create a new public card
 */
export interface CreatePublicCardData {
  userId: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  theme?: string; // defaults to "default" if not provided
}
