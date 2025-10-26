import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {SavedCardRepository} from "../infrastructure/SavedCardRepository";
import {PublicCardRepository} from "../infrastructure/PublicCardRepository";
import {PrivateCardRepository} from "../infrastructure/PrivateCardRepository";
import {ExchangeTokenRepository} from "../infrastructure/ExchangeTokenRepository";
import {SaveCardUseCase} from "../application/SaveCardUseCase";
import {GetSavedCardsUseCase} from "../application/GetSavedCardsUseCase";
import {SavePrivateCardUseCase} from "../application/SavePrivateCardUseCase";
import {MarkAsViewedUseCase} from "../application/MarkAsViewedUseCase";
import {DeleteSavedCardUseCase} from "../application/DeleteSavedCardUseCase";
import {SAVED_CARD_VALIDATION} from "../constants/validation";

const firestore = getFirestore();

/**
 * Callable function to save a card to user's collection
 */
export const saveCard = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const {cardUserId, memo, tags, eventId, badge} = request.data;

  // Validate input
  if (!cardUserId || typeof cardUserId !== "string") {
    throw new HttpsError("invalid-argument", "cardUserId is required");
  }

  try {
    logger.info("Saving card", {userId, cardUserId});

    // Initialize dependencies
    const savedCardRepository = new SavedCardRepository(firestore);
    const publicCardRepository = new PublicCardRepository(firestore);
    const saveCardUseCase = new SaveCardUseCase(savedCardRepository, publicCardRepository);

    // Execute use case
    const savedCard = await saveCardUseCase.execute({
      userId,
      cardUserId,
      memo,
      tags,
      eventId,
      badge,
    });

    logger.info("Card saved successfully", {
      userId,
      cardUserId,
      savedCardId: savedCard.savedCardId,
    });

    return {success: true, savedCardId: savedCard.savedCardId};
  } catch (error) {
    logger.error("Failed to save card", {
      userId,
      cardUserId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to save card"
    );
  }
});

/**
 * Callable function to get all saved cards with details
 * Supports filtering by cardType, eventId, and limit
 */
export const getSavedCards = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const {cardType, eventId, limit} = request.data || {};

  // Validate cardType
  if (cardType !== undefined && cardType !== "public" && cardType !== "private") {
    throw new HttpsError("invalid-argument", "cardType must be 'public' or 'private'");
  }

  // Validate limit
  if (limit !== undefined) {
    if (
      typeof limit !== "number" ||
      limit < SAVED_CARD_VALIDATION.LIMIT_MIN ||
      limit > SAVED_CARD_VALIDATION.LIMIT_MAX
    ) {
      throw new HttpsError(
        "invalid-argument",
        `limit must be between ${SAVED_CARD_VALIDATION.LIMIT_MIN} and ${SAVED_CARD_VALIDATION.LIMIT_MAX}`
      );
    }
  }

  try {
    logger.info("Getting saved cards", {userId, cardType, eventId, limit});

    // Initialize dependencies
    const savedCardRepository = new SavedCardRepository(firestore);
    const publicCardRepository = new PublicCardRepository(firestore);
    const privateCardRepository = new PrivateCardRepository(firestore);
    const getSavedCardsUseCase = new GetSavedCardsUseCase(
      savedCardRepository,
      publicCardRepository,
      privateCardRepository
    );

    // Execute use case with options
    const savedCards = await getSavedCardsUseCase.execute(userId, {
      cardType,
      eventId,
      limit,
    });

    // Serialize dates
    const serializedCards = savedCards.map((card) => ({
      ...card,
      savedAt: card.savedAt.toISOString(),
      lastViewedAt: card.lastViewedAt?.toISOString(),
      lastKnownUpdatedAt: card.lastKnownUpdatedAt?.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    }));

    logger.info("Retrieved saved cards successfully", {
      userId,
      count: serializedCards.length,
    });

    return serializedCards;
  } catch (error) {
    logger.error("Failed to get saved cards", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new HttpsError("internal", "Failed to get saved cards");
  }
});

/**
 * Callable function to save a private card via exchange token
 */
export const savePrivateCard = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const {tokenId} = request.data;

  // Validate input
  if (!tokenId || typeof tokenId !== "string") {
    throw new HttpsError("invalid-argument", "tokenId is required");
  }

  try {
    logger.info("Saving private card via token", {userId, tokenId});

    // Initialize dependencies
    const exchangeTokenRepository = new ExchangeTokenRepository(firestore);
    const privateCardRepository = new PrivateCardRepository(firestore);
    const savedCardRepository = new SavedCardRepository(firestore);
    const savePrivateCardUseCase = new SavePrivateCardUseCase(
      exchangeTokenRepository,
      privateCardRepository,
      savedCardRepository
    );

    // Execute use case
    const result = await savePrivateCardUseCase.execute({userId, tokenId});

    logger.info("Private card saved successfully", {
      userId,
      tokenId,
      savedCardId: result.savedCardId,
    });

    return {success: true, savedCardId: result.savedCardId};
  } catch (error) {
    logger.error("Failed to save private card", {
      userId,
      tokenId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Map specific errors to appropriate HTTP errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Token not found")) {
      throw new HttpsError("not-found", "Token not found");
    }
    if (errorMessage.includes("Cannot use your own token")) {
      throw new HttpsError("invalid-argument", "Cannot use your own token");
    }
    if (errorMessage.includes("already been used")) {
      throw new HttpsError("invalid-argument", "Token has already been used");
    }
    if (errorMessage.includes("expired")) {
      throw new HttpsError("invalid-argument", "Token has expired");
    }
    if (errorMessage.includes("Private card not found")) {
      throw new HttpsError("not-found", "Private card not found");
    }

    throw new HttpsError("internal", "Failed to save private card");
  }
});

/**
 * Callable function to mark a saved card as viewed
 */
export const markAsViewed = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const {savedCardId} = request.data;

  // Validate input
  if (!savedCardId || typeof savedCardId !== "string") {
    throw new HttpsError("invalid-argument", "savedCardId is required");
  }

  try {
    logger.info("Marking card as viewed", {userId, savedCardId});

    // Initialize dependencies
    const savedCardRepository = new SavedCardRepository(firestore);
    const publicCardRepository = new PublicCardRepository(firestore);
    const privateCardRepository = new PrivateCardRepository(firestore);
    const markAsViewedUseCase = new MarkAsViewedUseCase(
      savedCardRepository,
      publicCardRepository,
      privateCardRepository
    );

    // Execute use case
    await markAsViewedUseCase.execute({userId, savedCardId});

    logger.info("Card marked as viewed successfully", {userId, savedCardId});

    return {success: true};
  } catch (error) {
    logger.error("Failed to mark card as viewed", {
      userId,
      savedCardId,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Saved card not found")) {
      throw new HttpsError("not-found", "Saved card not found");
    }
    if (errorMessage.includes("not found")) {
      throw new HttpsError("not-found", "Card not found");
    }

    throw new HttpsError("internal", "Failed to mark card as viewed");
  }
});

/**
 * Callable function to delete a saved card
 */
export const deleteSavedCard = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const {savedCardId} = request.data;

  // Validate input
  if (!savedCardId || typeof savedCardId !== "string") {
    throw new HttpsError("invalid-argument", "savedCardId is required");
  }

  try {
    logger.info("Deleting saved card", {userId, savedCardId});

    // Initialize dependencies
    const savedCardRepository = new SavedCardRepository(firestore);
    const deleteSavedCardUseCase = new DeleteSavedCardUseCase(savedCardRepository);

    // Execute use case
    await deleteSavedCardUseCase.execute({userId, savedCardId});

    logger.info("Saved card deleted successfully", {userId, savedCardId});

    return {success: true};
  } catch (error) {
    logger.error("Failed to delete saved card", {
      userId,
      savedCardId,
      error: error instanceof Error ? error.message : String(error),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Saved card not found")) {
      throw new HttpsError("not-found", "Saved card not found");
    }

    throw new HttpsError("internal", "Failed to delete saved card");
  }
});
