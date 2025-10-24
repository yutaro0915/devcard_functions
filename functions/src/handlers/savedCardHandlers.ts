import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {SavedCardRepository} from "../infrastructure/SavedCardRepository";
import {PublicCardRepository} from "../infrastructure/PublicCardRepository";
import {SaveCardUseCase} from "../application/SaveCardUseCase";
import {GetSavedCardsUseCase} from "../application/GetSavedCardsUseCase";

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

    logger.info("Card saved successfully", {userId, cardUserId});

    return {success: true, savedCard};
  } catch (error) {
    logger.error("Failed to save card", {
      userId,
      cardUserId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new HttpsError("internal", error instanceof Error ? error.message : "Failed to save card");
  }
});

/**
 * Callable function to get all saved cards with details
 */
export const getSavedCards = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;

  try {
    logger.info("Getting saved cards", {userId});

    // Initialize dependencies
    const savedCardRepository = new SavedCardRepository(firestore);
    const publicCardRepository = new PublicCardRepository(firestore);
    const getSavedCardsUseCase = new GetSavedCardsUseCase(savedCardRepository, publicCardRepository);

    // Execute use case
    const savedCards = await getSavedCardsUseCase.execute(userId);

    logger.info("Retrieved saved cards successfully", {
      userId,
      count: savedCards.length,
    });

    return {success: true, savedCards};
  } catch (error) {
    logger.error("Failed to get saved cards", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new HttpsError("internal", "Failed to get saved cards");
  }
});
