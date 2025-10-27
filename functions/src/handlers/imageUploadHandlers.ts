import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {UploadProfileImageUseCase} from "../application/UploadProfileImageUseCase";
import {UploadCardBackgroundUseCase} from "../application/UploadCardBackgroundUseCase";
import {StorageService} from "../infrastructure/StorageService";
import {UserRepository} from "../infrastructure/UserRepository";
import {PublicCardRepository} from "../infrastructure/PublicCardRepository";
import {PrivateCardRepository} from "../infrastructure/PrivateCardRepository";
import {
  UserNotFoundError,
  PublicCardNotFoundError,
  ImageValidationError,
} from "../domain/errors/DomainErrors";

const firestore = getFirestore();

/**
 * Callable function to upload user profile image
 */
export const uploadProfileImage = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const {imageData, contentType} = request.data;

  // Validate input types
  if (typeof imageData !== "string" || !imageData) {
    throw new HttpsError("invalid-argument", "imageData must be a non-empty string");
  }
  if (typeof contentType !== "string" || !contentType) {
    throw new HttpsError("invalid-argument", "contentType must be a non-empty string");
  }

  try {
    logger.info("Uploading profile image", {userId});

    // Initialize dependencies
    const storageService = new StorageService();
    const userRepository = new UserRepository(firestore);
    const publicCardRepository = new PublicCardRepository(firestore);
    const privateCardRepository = new PrivateCardRepository(firestore);

    const useCase = new UploadProfileImageUseCase(
      storageService,
      userRepository,
      publicCardRepository,
      privateCardRepository
    );

    // Execute use case
    const result = await useCase.execute({
      userId,
      imageData,
      contentType,
    });

    logger.info("Profile image uploaded successfully", {userId, photoURL: result.photoURL});

    return {
      success: true,
      photoURL: result.photoURL,
    };
  } catch (error) {
    logger.error("Failed to upload profile image", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Re-throw HttpsError as-is
    if (error instanceof HttpsError) {
      throw error;
    }

    // Handle domain errors
    if (error instanceof ImageValidationError) {
      throw new HttpsError("invalid-argument", error.message);
    }

    if (error instanceof UserNotFoundError || error instanceof PublicCardNotFoundError) {
      throw new HttpsError("not-found", error.message);
    }

    throw new HttpsError("internal", "Failed to upload profile image");
  }
});

/**
 * Callable function to upload card background image
 */
export const uploadCardBackground = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const {imageData, contentType} = request.data;

  // Validate input types
  if (typeof imageData !== "string" || !imageData) {
    throw new HttpsError("invalid-argument", "imageData must be a non-empty string");
  }
  if (typeof contentType !== "string" || !contentType) {
    throw new HttpsError("invalid-argument", "contentType must be a non-empty string");
  }

  try {
    logger.info("Uploading card background image", {userId});

    // Initialize dependencies
    const storageService = new StorageService();
    const publicCardRepository = new PublicCardRepository(firestore);

    const useCase = new UploadCardBackgroundUseCase(storageService, publicCardRepository);

    // Execute use case
    const result = await useCase.execute({
      userId,
      imageData,
      contentType,
    });

    logger.info("Card background image uploaded successfully", {
      userId,
      backgroundImageUrl: result.backgroundImageUrl,
    });

    return {
      success: true,
      backgroundImageUrl: result.backgroundImageUrl,
    };
  } catch (error) {
    logger.error("Failed to upload card background image", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Re-throw HttpsError as-is
    if (error instanceof HttpsError) {
      throw error;
    }

    // Handle domain errors
    if (error instanceof ImageValidationError) {
      throw new HttpsError("invalid-argument", error.message);
    }

    if (error instanceof PublicCardNotFoundError) {
      throw new HttpsError("not-found", error.message);
    }

    throw new HttpsError("internal", "Failed to upload card background image");
  }
});
