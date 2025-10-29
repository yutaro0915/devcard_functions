import {Card, VisibilityLevel} from "./Card";
import {getVisibility} from "../constants/visibility";

/**
 * Filter card data based on visibility settings
 */
export class CardVisibilityFilter {
  /**
   * Filter card for public view (anyone can see)
   */
  static filterPublic(card: Card): Partial<Card> {
    return this.filterByVisibility(card, ["public"]);
  }

  /**
   * Filter card for private view (owner + exchanged users)
   */
  static filterPrivate(card: Card): Partial<Card> {
    return this.filterByVisibility(card, ["public", "private"]);
  }

  /**
   * Filter card fields based on allowed visibility levels
   */
  private static filterByVisibility(
    card: Card,
    allowedLevels: VisibilityLevel[]
  ): Partial<Card> {
    const filtered: Partial<Card> = {
      userId: card.userId,
      displayName: card.displayName,
      theme: card.theme,
      updatedAt: card.updatedAt,
    };

    // Filter optional fields based on visibility
    const fields: (keyof Card)[] = [
      "photoURL",
      "bio",
      "backgroundImageUrl",
      "email",
      "phoneNumber",
      "github",
      "x",
      "linkedin",
      "instagram",
      "facebook",
      "zenn",
      "qiita",
      "line",
      "discord",
      "telegram",
      "slack",
      "website",
      "blog",
      "youtube",
      "twitch",
      "otherContacts",
      "customCss",
      "badges",
    ];

    for (const field of fields) {
      const value = card[field];
      if (value !== undefined) {
        const visibility = getVisibility(field, card.visibility);
        if (allowedLevels.includes(visibility)) {
          (filtered as any)[field] = value;
        }
      }
    }

    return filtered;
  }
}
