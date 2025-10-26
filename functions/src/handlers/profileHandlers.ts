import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {UserRepository} from "../infrastructure/UserRepository";
import {PublicCardRepository} from "../infrastructure/PublicCardRepository";
import {UpdateProfileUseCase} from "../application/UpdateProfileUseCase";

const firestore = getFirestore();

/**
 * Callable function to update user profile
 * Updates both /users and /public_cards collections
 */
export const updateProfile = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const {displayName, bio, photoURL} = request.data;

  // Validate input types
  if (displayName !== undefined && typeof displayName !== "string") {
    throw new HttpsError("invalid-argument", "displayName must be a string");
  }
  if (bio !== undefined && typeof bio !== "string") {
    throw new HttpsError("invalid-argument", "bio must be a string");
  }
  if (photoURL !== undefined && typeof photoURL !== "string") {
    throw new HttpsError("invalid-argument", "photoURL must be a string");
  }

  try {
    logger.info("Updating user profile", {userId, displayName, bio, photoURL});

    // Initialize dependencies
    const userRepository = new UserRepository(firestore);
    const publicCardRepository = new PublicCardRepository(firestore);
    const updateProfileUseCase = new UpdateProfileUseCase(
      userRepository,
      publicCardRepository
    );

    // Execute use case
    await updateProfileUseCase.execute({
      userId,
      displayName,
      bio,
      photoURL,
    });

    logger.info("Profile updated successfully", {userId});

    return {success: true};
  } catch (error) {
    logger.error("Failed to update profile", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to update profile"
    );
  }
});
