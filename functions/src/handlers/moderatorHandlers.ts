import {onCall, HttpsError} from "firebase-functions/v2/https";
import {getFirestore} from "firebase-admin/firestore";
import {ModeratorRepository} from "../infrastructure/ModeratorRepository";
import {UserRepository} from "../infrastructure/UserRepository";
import {AddModeratorUseCase} from "../application/AddModeratorUseCase";
import {UserNotFoundError} from "../domain/errors/DomainErrors";

const firestore = getFirestore();

/**
 * Callable Function: addModerator
 * Admin-only function to add a new moderator
 */
export const addModerator = onCall(async (request) => {
  // Authentication check
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Authorization check: admin only
  const isAdmin = request.auth.token.admin === true;
  if (!isAdmin) {
    throw new HttpsError("permission-denied", "Only administrators can add moderators");
  }

  // Validate request data
  const {userId, role, permissions} = request.data;

  if (!userId || typeof userId !== "string") {
    throw new HttpsError("invalid-argument", "userId is required and must be a string");
  }

  if (!role || (role !== "admin" && role !== "moderator")) {
    throw new HttpsError(
      "invalid-argument",
      "role is required and must be either 'admin' or 'moderator'"
    );
  }

  if (!Array.isArray(permissions)) {
    throw new HttpsError("invalid-argument", "permissions must be an array");
  }

  try {
    const moderatorRepository = new ModeratorRepository(firestore);
    const userRepository = new UserRepository(firestore);
    const useCase = new AddModeratorUseCase(moderatorRepository, userRepository);

    const moderator = await useCase.execute({
      userId,
      role,
      permissions,
    });

    return {
      success: true,
      moderator: {
        userId: moderator.userId,
        role: moderator.role,
        permissions: moderator.permissions,
        createdAt: moderator.createdAt.toISOString(),
      },
    };
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      throw new HttpsError(
        "not-found",
        `User ${error.userId} not found. Please ensure the user has signed up first.`
      );
    }
    throw new HttpsError("internal", "Failed to add moderator");
  }
});
