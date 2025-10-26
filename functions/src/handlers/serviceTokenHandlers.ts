import {CallableRequest, onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {UserRepository} from "../infrastructure/UserRepository";
import {SaveGitHubTokenUseCase} from "../application/SaveGitHubTokenUseCase";

const firestore = getFirestore();

/**
 * Generic handler for saving service OAuth tokens
 */
async function saveServiceToken(
  request: CallableRequest,
  serviceName: string,
  useCaseExecutor: (userId: string, token: string) => Promise<void>
) {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const {accessToken} = request.data;

  // Validate input
  if (!accessToken || typeof accessToken !== "string") {
    throw new HttpsError("invalid-argument", "accessToken is required");
  }

  try {
    logger.info(`Saving ${serviceName} access token`, {userId});

    await useCaseExecutor(userId, accessToken);

    logger.info(`${serviceName} access token saved successfully`, {userId});

    return {success: true};
  } catch (error) {
    logger.error(`Failed to save ${serviceName} access token`, {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new HttpsError("internal", `Failed to save ${serviceName} access token`);
  }
}

/**
 * Callable function to save GitHub OAuth access token
 */
export const saveGitHubToken = onCall(async (request) => {
  const userRepository = new UserRepository(firestore);
  const saveGitHubTokenUseCase = new SaveGitHubTokenUseCase(userRepository);

  return await saveServiceToken(request, "GitHub", (userId, token) =>
    saveGitHubTokenUseCase.execute({userId, accessToken: token})
  );
});
