import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {UserRepository} from "../infrastructure/UserRepository";
import {PublicCardRepository} from "../infrastructure/PublicCardRepository";
import {GitHubService} from "../infrastructure/GitHubService";
import {SyncGitHubDataUseCase} from "../application/SyncGitHubDataUseCase";

const firestore = getFirestore();

/**
 * Callable function to manually sync external service data
 * Can sync specific service or all connected services
 */
export const manualSync = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const {serviceName} = request.data || {};

  try {
    logger.info("Starting manual sync", {userId, serviceName: serviceName || "all"});

    // Initialize dependencies
    const userRepository = new UserRepository(firestore);
    const publicCardRepository = new PublicCardRepository(firestore);

    // Determine which services to sync
    const servicesToSync: string[] = serviceName ? [serviceName] : ["github"];

    // Execute sync for each service
    const results: Record<string, {success: boolean; error?: string}> = {};

    for (const service of servicesToSync) {
      try {
        if (service === "github") {
          const gitHubService = new GitHubService();
          const syncGitHubUseCase = new SyncGitHubDataUseCase(
            userRepository,
            publicCardRepository,
            gitHubService
          );
          await syncGitHubUseCase.execute(userId);
          results[service] = {success: true};
          logger.info("GitHub sync completed", {userId});
        } else {
          // Other services not yet implemented
          results[service] = {
            success: false,
            error: `Service '${service}' is not yet implemented`,
          };
          logger.warn("Unsupported service", {userId, service});
        }
      } catch (error) {
        results[service] = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
        logger.error(`Failed to sync ${service}`, {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Check if all syncs failed
    const allFailed = Object.values(results).every((result) => !result.success);
    if (allFailed) {
      throw new HttpsError("internal", "All service syncs failed");
    }

    logger.info("Manual sync completed", {userId, results});

    return {
      success: true,
      results,
    };
  } catch (error) {
    logger.error("Manual sync failed", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Re-throw if already HttpsError
    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", "Failed to sync data");
  }
});
