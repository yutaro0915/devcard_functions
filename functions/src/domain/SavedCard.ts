/**
 * SavedCard entity - metadata for a saved card
 * Stored in /users/{userId}/saved_cards/{cardUserId} subcollection
 * Full card details are fetched from /public_cards/{cardUserId}
 */
export interface SavedCard {
  cardUserId: string; // The userId of the card owner
  savedAt: Date;

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
  cardUserId: string; // The card being saved
  memo?: string;
  tags?: string[];
  eventId?: string;
  badge?: string;
}
