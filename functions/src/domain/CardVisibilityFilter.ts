import {Card, VisibilityLevel} from "./Card";

/**
 * Filter card data based on visibility level
 */
export class CardVisibilityFilter {
  /**
   * Filter card for public view
   * Returns only fields where visibility is 'public'
   */
  static filterPublic(card: Card): Partial<Card> {
    const filtered: Partial<Card> = {
      userId: card.userId,
      displayName: card.displayName,
      photoURL: card.photoURL,
      connectedServices: card.connectedServices,
      theme: card.theme,
      customCss: card.customCss,
      updatedAt: card.updatedAt,
    };

    // Conditionally include fields based on visibility
    if (card.visibility.bio === "public" && card.bio) {
      filtered.bio = card.bio;
    }

    if (card.visibility.backgroundImage === "public" && card.backgroundImageUrl) {
      filtered.backgroundImageUrl = card.backgroundImageUrl;
    }

    if (card.visibility.badges === "public" && card.badges) {
      filtered.badges = card.badges;
    }

    return filtered;
  }

  /**
   * Filter card for private view (owner only)
   * Returns all fields including private contacts
   */
  static filterPrivate(card: Card): Card {
    // Owner can see everything
    return card;
  }

  /**
   * Check if a field should be visible based on visibility level
   */
  static isVisible(visibility: VisibilityLevel, requestedLevel: "public" | "private"): boolean {
    if (visibility === "hidden") return false;
    if (requestedLevel === "private") return true; // Owner can see everything
    return visibility === "public";
  }
}
