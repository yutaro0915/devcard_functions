import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {ManualSyncUseCase} from "../application/ManualSyncUseCase";
import {UserRepository} from "../infrastructure/UserRepository";
import {PublicCardRepository} from "../infrastructure/PublicCardRepository";
import {GitHubApiClient} from "../infrastructure/GitHubApiClient";
import {UserNotFoundError, PublicCardNotFoundError} from "../domain/errors/DomainErrors";

const firestore = getFirestore();

/**
 * Callable function for manual synchronization of external services
 * Currently supports GitHub only
 */
export const manualSync = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const {services} = request.data;

  // Validate input: services must be a non-empty array
  if (!services) {
    throw new HttpsError("invalid-argument", "services field is required");
  }
  if (!Array.isArray(services)) {
    throw new HttpsError("invalid-argument", "services must be an array");
  }
  if (services.length === 0) {
    throw new HttpsError("invalid-argument", "services array must not be empty");
  }
  // Validate array elements are strings
  if (!services.every((s) => typeof s === "string")) {
    throw new HttpsError("invalid-argument", "services array must contain only strings");
  }

  try {
    logger.info("Starting manual sync", {userId, services});

    // Initialize dependencies
    const userRepository = new UserRepository(firestore);
    const publicCardRepository = new PublicCardRepository(firestore);
    const gitHubService = new GitHubApiClient();

    const manualSyncUseCase = new ManualSyncUseCase(
      userRepository,
      publicCardRepository,
      gitHubService
    );

    // Execute use case
    const result = await manualSyncUseCase.execute({
      userId,
      services,
    });

    logger.info("Manual sync completed", {
      userId,
      syncedServices: result.syncedServices,
      hasErrors: !!result.errors,
    });

    return result;
  } catch (error) {
    logger.error("Failed to sync services", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Re-throw HttpsError as-is
    if (error instanceof HttpsError) {
      throw error;
    }

    // Issue #17: Use instanceof checks instead of string matching
    if (error instanceof UserNotFoundError || error instanceof PublicCardNotFoundError) {
      throw new HttpsError("not-found", error.message);
    }

    throw new HttpsError("internal", "Failed to sync services");
  }
});
