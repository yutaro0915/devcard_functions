/**
 * PrivateCard entity - private contact information
 * This data is stored in /private_cards/{userId} collection
 * Only accessible by the owner
 */
export interface PrivateCard {
  userId: string;

  // Basic profile (synced with User and PublicCard)
  displayName: string;
  photoURL?: string;

  // Private contact information
  email?: string;
  phoneNumber?: string;
  lineId?: string;
  discordId?: string;
  twitterHandle?: string;
  otherContacts?: string; // Free-form text for additional contacts

  // Badges
  badges?: string[]; // Badge IDs where showOnPrivateCard=true

  // Metadata
  updatedAt: Date;
  isDeleted?: boolean; // Soft delete flag
}

/**
 * Data required to create a new private card
 */
export interface CreatePrivateCardData {
  userId: string;
  displayName: string;
  photoURL?: string;
  email?: string;
  phoneNumber?: string;
  lineId?: string;
  discordId?: string;
  twitterHandle?: string;
  otherContacts?: string;
}
