/**
 * Visibility level for card fields
 */
export type VisibilityLevel = "public" | "private" | "hidden";

/**
 * Visibility settings for card fields
 */
export interface CardVisibility {
  bio: VisibilityLevel;
  backgroundImage: VisibilityLevel;
  badges: VisibilityLevel;
}

/**
 * Private contact information (nested structure)
 */
export interface PrivateContacts {
  email?: string;
  phoneNumber?: string;
  lineId?: string;
  discordId?: string;
  twitterHandle?: string;
  otherContacts?: string;
}

// Re-export ConnectedService from existing file
export type {ConnectedService} from "./PublicCard";

/**
 * Unified Card entity - replaces PublicCard and PrivateCard
 * Stored in /cards/{userId} collection
 */
export interface Card {
  userId: string;

  // Basic profile
  displayName: string;
  photoURL?: string;
  bio?: string;
  backgroundImageUrl?: string;

  // Public information
  connectedServices: Record<string, import("./PublicCard").ConnectedService>;
  theme: string;
  customCss?: string;
  badges?: string[];

  // Private contact information
  privateContacts?: PrivateContacts;

  // Visibility settings
  visibility: CardVisibility;

  // Metadata
  updatedAt: Date;
  isDeleted?: boolean;
}

/**
 * Data required to create a new card
 */
export interface CreateCardData {
  userId: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  theme?: string;
}

/**
 * Data for updating a card
 */
export interface UpdateCardData {
  displayName?: string;
  photoURL?: string;
  bio?: string;
  backgroundImageUrl?: string;
  connectedServices?: Record<string, import("./PublicCard").ConnectedService>;
  theme?: string;
  customCss?: string;
  badges?: string[];
  privateContacts?: PrivateContacts;
  visibility?: Partial<CardVisibility>;
}
