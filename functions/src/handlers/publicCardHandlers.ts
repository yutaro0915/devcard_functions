import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {PublicCardRepository} from "../infrastructure/PublicCardRepository";
import {GetPublicCardUseCase} from "../application/GetPublicCardUseCase";

const firestore = getFirestore();

/**
 * Callable function to get a public card by userId
 * No authentication required - public cards are accessible to everyone
 */
export const getPublicCard = onCall(async (request) => {
  const {userId} = request.data;

  // Validate input
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    throw new HttpsError("invalid-argument", "userId is required and must be a non-empty string");
  }

  try {
    logger.info("Getting public card", {userId});

    // Initialize dependencies
    const publicCardRepository = new PublicCardRepository(firestore);
    const getPublicCardUseCase = new GetPublicCardUseCase(publicCardRepository);

    // Execute use case
    const publicCard = await getPublicCardUseCase.execute(userId);

    // Check if card exists
    if (!publicCard) {
      logger.warn("Public card not found", {userId});
      throw new HttpsError("not-found", "Public card not found");
    }

    logger.info("Retrieved public card successfully", {userId});

    // Convert Date to ISO 8601 string for JSON serialization
    const publicCardResponse = {
      ...publicCard,
      updatedAt: publicCard.updatedAt.toISOString(),
    };

    return {success: true, publicCard: publicCardResponse};
  } catch (error) {
    // Re-throw HttpsError as is
    if (error instanceof HttpsError) {
      throw error;
    }

    // Log and throw internal error for unexpected errors
    logger.error("Failed to get public card", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new HttpsError("internal", "Failed to get public card");
  }
});
