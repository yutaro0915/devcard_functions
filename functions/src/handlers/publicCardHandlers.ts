import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {PublicCardRepository} from "../infrastructure/PublicCardRepository";
import {GetPublicCardUseCase} from "../application/GetPublicCardUseCase";

const firestore = getFirestore();

/**
 * Callable function to get public card by userId
 * This is publicly accessible (no auth required)
 */
export const getPublicCard = onCall(async (request) => {
  const {userId} = request.data;

  // Validate input
  if (!userId || typeof userId !== "string") {
    throw new HttpsError("invalid-argument", "userId is required");
  }

  try {
    logger.info("Getting public card", {userId});

    // Initialize dependencies
    const publicCardRepository = new PublicCardRepository(firestore);
    const getPublicCardUseCase = new GetPublicCardUseCase(publicCardRepository);

    // Execute use case
    const publicCard = await getPublicCardUseCase.execute(userId);

    logger.info("Public card retrieved successfully", {userId});

    return {
      success: true,
      publicCard,
    };
  } catch (error) {
    logger.error("Failed to get public card", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to get public card"
    );
  }
});
