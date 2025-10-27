import {ISavedCardRepository, FindSavedCardsOptions} from "../domain/ISavedCardRepository";
import {IPublicCardRepository} from "../domain/IPublicCardRepository";
import {IPrivateCardRepository} from "../domain/IPrivateCardRepository";
import {SavedCard} from "../domain/SavedCard";
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
    private publicCardRepository: IPublicCardRepository,
    private privateCardRepository: IPrivateCardRepository
  ) {}

  async execute(userId: string, options?: FindSavedCardsOptions): Promise<SavedCardWithDetails[]> {
    // Get saved card metadata with filters
    const savedCards = await this.savedCardRepository.findByUserId(userId, options);

    // Fetch master card details for each saved card
    const cardsWithDetails = await Promise.all(
      savedCards.map(async (savedCard) => {
        if (savedCard.cardType === "public") {
          return this.buildPublicCardDetails(savedCard);
        } else {
          return this.buildPrivateCardDetails(savedCard);
        }
      })
    );

    // Filter out null results (deleted cards can be null)
    return cardsWithDetails.filter((card) => card !== null) as SavedCardWithDetails[];
  }

  private async buildPublicCardDetails(savedCard: SavedCard): Promise<SavedCardWithDetails | null> {
    const publicCard = await this.publicCardRepository.findByUserId(savedCard.cardUserId);

    if (!publicCard) {
      // Card was deleted
      return {
        savedCardId: savedCard.savedCardId,
        cardUserId: savedCard.cardUserId,
        cardType: "public",
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
    const hasUpdate = this.calculateHasUpdate(savedCard.lastKnownUpdatedAt, publicCard.updatedAt);

    return {
      savedCardId: savedCard.savedCardId,
      cardUserId: savedCard.cardUserId,
      cardType: "public",
      savedAt: savedCard.savedAt,
      lastViewedAt: savedCard.lastViewedAt,
      lastKnownUpdatedAt: savedCard.lastKnownUpdatedAt,
      memo: savedCard.memo,
      tags: savedCard.tags,
      eventId: savedCard.eventId,
      badge: savedCard.badge,
      hasUpdate,
      displayName: publicCard.displayName,
      photoURL: publicCard.photoURL,
      updatedAt: publicCard.updatedAt,
      bio: publicCard.bio,
      connectedServices: publicCard.connectedServices,
      theme: publicCard.theme,
      customCss: publicCard.customCss,
    };
  }

  private async buildPrivateCardDetails(
    savedCard: SavedCard
  ): Promise<SavedCardWithDetails | null> {
    const privateCard = await this.privateCardRepository.findByUserId(savedCard.cardUserId);

    if (!privateCard) {
      // Card was deleted
      return {
        savedCardId: savedCard.savedCardId,
        cardUserId: savedCard.cardUserId,
        cardType: "private",
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
    const hasUpdate = this.calculateHasUpdate(savedCard.lastKnownUpdatedAt, privateCard.updatedAt);

    return {
      savedCardId: savedCard.savedCardId,
      cardUserId: savedCard.cardUserId,
      cardType: "private",
      savedAt: savedCard.savedAt,
      lastViewedAt: savedCard.lastViewedAt,
      lastKnownUpdatedAt: savedCard.lastKnownUpdatedAt,
      memo: savedCard.memo,
      tags: savedCard.tags,
      eventId: savedCard.eventId,
      badge: savedCard.badge,
      hasUpdate,
      displayName: privateCard.displayName,
      photoURL: privateCard.photoURL,
      updatedAt: privateCard.updatedAt,
      email: privateCard.email,
      phoneNumber: privateCard.phoneNumber,
      lineId: privateCard.lineId,
      discordId: privateCard.discordId,
      twitterHandle: privateCard.twitterHandle,
      otherContacts: privateCard.otherContacts,
    };
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
