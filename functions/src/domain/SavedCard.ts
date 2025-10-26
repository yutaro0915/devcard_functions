/**
 * SavedCard entity - metadata for a saved card
 * Stored in /users/{userId}/saved_cards/{randomId} subcollection
 * Full card details are fetched from /public_cards/{cardUserId} or /private_cards/{cardUserId}
 */
export interface SavedCard {
  savedCardId: string; // Random ID (document ID)
  cardUserId: string; // The userId of the card owner
  cardType: "public" | "private"; // Type of card (public or private)
  savedAt: Date;

  // Update tracking
  lastKnownUpdatedAt?: Date; // Last known updatedAt of the master card
  lastViewedAt?: Date; // Last time the user viewed this card

  // Optional metadata
  memo?: string;
  tags?: string[];
  eventId?: string; // For event-based features
  badge?: string; // Special badges (e.g., "VIP", "Speaker")
}

/**
 * Data required to save a card
 */
export interface SaveCardData {
  userId: string; // The user who is saving the card
  savedCardId?: string; // Optional: specify savedCardId (otherwise auto-generated)
  cardUserId: string; // The card being saved
  cardType: "public" | "private"; // Type of card
  lastKnownUpdatedAt?: Date; // Initial lastKnownUpdatedAt
  memo?: string;
  tags?: string[];
  eventId?: string;
  badge?: string;
}
