import {ISavedCardRepository, FindSavedCardsOptions} from "../domain/ISavedCardRepository";
import {ICardRepository} from "../domain/ICardRepository";
import {SavedCard} from "../domain/SavedCard";
import {CardVisibilityFilter} from "../domain/CardVisibilityFilter";
import type {ConnectedService} from "../domain/PublicCard";

/**
 * Combined SavedCard with card details (Public or Private)
 */
export interface SavedCardWithDetails {
  // Metadata from SavedCard
  savedCardId: string;
  cardUserId: string;
  cardType: "public" | "private";
  savedAt: Date;
  lastViewedAt?: Date;
  lastKnownUpdatedAt?: Date;
  memo?: string;
  tags?: string[];
  eventId?: string;
  badge?: string;

  // Update tracking
  hasUpdate: boolean;

  // Common fields from master card
  displayName: string;
  photoURL?: string;
  updatedAt: Date;

  // Conditional fields - Public
  bio?: string;
  connectedServices?: Record<string, ConnectedService>;
  theme?: string;
  customCss?: string;

  // Conditional fields - Private
  email?: string;
  phoneNumber?: string;
  lineId?: string;
  discordId?: string;
  twitterHandle?: string;
  otherContacts?: string;

  // Special flags
  isDeleted?: boolean; // Master card was deleted
}

/**
 * Use case for getting all saved cards with their details
 * Supports Public and Private cards with update detection
 */
export class GetSavedCardsUseCase {
  constructor(
    private savedCardRepository: ISavedCardRepository,
    private cardRepository: ICardRepository
  ) {}

  async execute(userId: string, options?: FindSavedCardsOptions): Promise<SavedCardWithDetails[]> {
    // Get saved card metadata with filters
    const savedCards = await this.savedCardRepository.findByUserId(userId, options);

    // Fetch master card details for each saved card
    const cardsWithDetails = await Promise.all(
      savedCards.map(async (savedCard) => {
        return this.buildCardDetails(savedCard);
      })
    );

    // Filter out null results (deleted cards can be null)
    return cardsWithDetails.filter((card) => card !== null) as SavedCardWithDetails[];
  }

  private async buildCardDetails(savedCard: SavedCard): Promise<SavedCardWithDetails | null> {
    const card = await this.cardRepository.findById(savedCard.cardUserId);

    if (!card) {
      // Card was deleted
      return {
        savedCardId: savedCard.savedCardId,
        cardUserId: savedCard.cardUserId,
        cardType: savedCard.cardType,
        savedAt: savedCard.savedAt,
        lastViewedAt: savedCard.lastViewedAt,
        lastKnownUpdatedAt: savedCard.lastKnownUpdatedAt,
        memo: savedCard.memo,
        tags: savedCard.tags,
        eventId: savedCard.eventId,
        badge: savedCard.badge,
        hasUpdate: false,
        displayName: "[Deleted]",
        updatedAt: new Date(),
        isDeleted: true,
      };
    }

    // Calculate hasUpdate
    const hasUpdate = this.calculateHasUpdate(savedCard.lastKnownUpdatedAt, card.updatedAt);

    // Apply visibility filter based on cardType
    const filteredCard =
      savedCard.cardType === "public"
        ? CardVisibilityFilter.filterPublic(card)
        : CardVisibilityFilter.filterPrivate(card);

    // Build response
    const result: SavedCardWithDetails = {
      savedCardId: savedCard.savedCardId,
      cardUserId: savedCard.cardUserId,
      cardType: savedCard.cardType,
      savedAt: savedCard.savedAt,
      lastViewedAt: savedCard.lastViewedAt,
      lastKnownUpdatedAt: savedCard.lastKnownUpdatedAt,
      memo: savedCard.memo,
      tags: savedCard.tags,
      eventId: savedCard.eventId,
      badge: savedCard.badge,
      hasUpdate,
      displayName: card.displayName,
      photoURL: card.photoURL,
      updatedAt: card.updatedAt,
    };

    // Add public fields
    if ("bio" in filteredCard && filteredCard.bio) result.bio = filteredCard.bio;
    if ("connectedServices" in filteredCard)
      result.connectedServices = filteredCard.connectedServices;
    if ("theme" in filteredCard) result.theme = filteredCard.theme;
    if ("customCss" in filteredCard) result.customCss = filteredCard.customCss;

    // Add private fields (only if cardType === 'private')
    if (savedCard.cardType === "private" && card.privateContacts) {
      result.email = card.privateContacts.email;
      result.phoneNumber = card.privateContacts.phoneNumber;
      result.lineId = card.privateContacts.lineId;
      result.discordId = card.privateContacts.discordId;
      result.twitterHandle = card.privateContacts.twitterHandle;
      result.otherContacts = card.privateContacts.otherContacts;
    }

    return result;
  }

  /**
   * Calculate hasUpdate flag
   * Returns true if lastKnownUpdatedAt is undefined or older than masterUpdatedAt
   * Fixed Issue #53: Use < instead of <= to correctly detect updates
   * When lastKnownUpdatedAt == masterUpdatedAt, the card has been viewed and is up to date
   */
  private calculateHasUpdate(lastKnownUpdatedAt: Date | undefined, masterUpdatedAt: Date): boolean {
    if (!lastKnownUpdatedAt) {
      return true; // Never viewed or no tracking
    }

    // Issue #53: Use < (not <=) so that viewed cards correctly show hasUpdate=false
    return lastKnownUpdatedAt.getTime() < masterUpdatedAt.getTime();
  }
}
