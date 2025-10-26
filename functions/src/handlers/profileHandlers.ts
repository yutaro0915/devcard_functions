import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {UpdateProfileUseCase} from "../application/UpdateProfileUseCase";
import {ProfileUpdateTransaction} from "../infrastructure/ProfileUpdateTransaction";
import {PROFILE_VALIDATION} from "../constants/validation";

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

  // Validate input types and lengths
  if (displayName !== undefined) {
    if (typeof displayName !== "string") {
      throw new HttpsError("invalid-argument", "displayName must be a string");
    }
    if (
      displayName.length < PROFILE_VALIDATION.DISPLAY_NAME_MIN_LENGTH ||
      displayName.length > PROFILE_VALIDATION.DISPLAY_NAME_MAX_LENGTH
    ) {
      throw new HttpsError(
        "invalid-argument",
        `displayName must be between ${PROFILE_VALIDATION.DISPLAY_NAME_MIN_LENGTH} and ${PROFILE_VALIDATION.DISPLAY_NAME_MAX_LENGTH} characters`
      );
    }
  }
  if (bio !== undefined) {
    if (typeof bio !== "string") {
      throw new HttpsError("invalid-argument", "bio must be a string");
    }
    if (bio.length > PROFILE_VALIDATION.BIO_MAX_LENGTH) {
      throw new HttpsError(
        "invalid-argument",
        `bio must be at most ${PROFILE_VALIDATION.BIO_MAX_LENGTH} characters`
      );
    }
  }
  if (photoURL !== undefined) {
    if (typeof photoURL !== "string") {
      throw new HttpsError("invalid-argument", "photoURL must be a string");
    }
    // Validate URL format and protocol
    try {
      const url = new URL(photoURL);
      if (url.protocol !== "https:") {
        throw new HttpsError("invalid-argument", "photoURL must use HTTPS protocol");
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("invalid-argument", "photoURL must be a valid URL");
    }
  }

  // Validate that at least one field is provided
  if (displayName === undefined && bio === undefined && photoURL === undefined) {
    throw new HttpsError(
      "invalid-argument",
      "At least one field (displayName, bio, or photoURL) must be provided"
    );
  }

  try {
    logger.info("Updating user profile", {userId});

    // Initialize dependencies
    const transaction = new ProfileUpdateTransaction(firestore);
    const updateProfileUseCase = new UpdateProfileUseCase(transaction);

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

    // Re-throw HttpsError as-is
    if (error instanceof HttpsError) {
      throw error;
    }

    // Convert specific errors to appropriate HttpsError
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("not found")) {
      throw new HttpsError("not-found", errorMessage);
    }

    throw new HttpsError("internal", "Failed to update profile");
  }
});
