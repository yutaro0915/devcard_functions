import {onCall, HttpsError} from "firebase-functions/v2/https";
import {getFirestore} from "firebase-admin/firestore";
import {BadgeRepository} from "../infrastructure/BadgeRepository";
import {UserRepository} from "../infrastructure/UserRepository";
import {CreateBadgeUseCase} from "../application/CreateBadgeUseCase";
import {ListBadgesUseCase} from "../application/ListBadgesUseCase";
import {GrantBadgeUseCase} from "../application/GrantBadgeUseCase";
import {RevokeBadgeUseCase} from "../application/RevokeBadgeUseCase";
import {BADGE_VALIDATION} from "../constants/validation";
import {
  BadgeNotFoundError,
  UserNotFoundError,
  BadgeAlreadyGrantedError,
} from "../domain/errors/DomainErrors";

const firestore = getFirestore();

/**
 * Check if user is a moderator or admin
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checkModeratorPermission(request: {auth?: any}): void {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const isModerator = request.auth.token.moderator === true;
  const isAdmin = request.auth.token.admin === true;

  if (!isModerator && !isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only moderators and administrators can perform this action"
    );
  }
}

/**
 * Callable Function: createBadge
 * Moderator/Admin function to create a new badge
 */
export const createBadge = onCall(async (request) => {
  checkModeratorPermission(request);

  // Validate request data
  const {name, description, iconUrl, color, priority, isActive} = request.data;

  if (!name || typeof name !== "string") {
    throw new HttpsError("invalid-argument", "name is required and must be a string");
  }

  if (name.length < BADGE_VALIDATION.NAME_MIN_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `name must be at least ${BADGE_VALIDATION.NAME_MIN_LENGTH} character`
    );
  }

  if (name.length > BADGE_VALIDATION.NAME_MAX_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `name must be at most ${BADGE_VALIDATION.NAME_MAX_LENGTH} characters`
    );
  }

  if (!description || typeof description !== "string") {
    throw new HttpsError("invalid-argument", "description is required and must be a string");
  }

  if (description.length < BADGE_VALIDATION.DESCRIPTION_MIN_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `description must be at least ${BADGE_VALIDATION.DESCRIPTION_MIN_LENGTH} character`
    );
  }

  if (description.length > BADGE_VALIDATION.DESCRIPTION_MAX_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `description must be at most ${BADGE_VALIDATION.DESCRIPTION_MAX_LENGTH} characters`
    );
  }

  if (iconUrl !== undefined && (typeof iconUrl !== "string" || !iconUrl.startsWith("https://"))) {
    throw new HttpsError("invalid-argument", "iconUrl must be a valid HTTPS URL");
  }

  if (color !== undefined && typeof color !== "string") {
    throw new HttpsError("invalid-argument", "color must be a string");
  }

  if (typeof priority !== "number" || priority < BADGE_VALIDATION.PRIORITY_MIN) {
    throw new HttpsError(
      "invalid-argument",
      `priority must be a number >= ${BADGE_VALIDATION.PRIORITY_MIN}`
    );
  }

  if (typeof isActive !== "boolean") {
    throw new HttpsError("invalid-argument", "isActive must be a boolean");
  }

  try {
    const badgeRepository = new BadgeRepository(firestore);
    const useCase = new CreateBadgeUseCase(badgeRepository);

    const badge = await useCase.execute({
      name,
      description,
      iconUrl,
      color,
      priority,
      isActive,
      createdBy: request.auth!.uid,
    });

    return {
      success: true,
      badge: {
        badgeId: badge.badgeId,
        name: badge.name,
        description: badge.description,
        iconUrl: badge.iconUrl,
        color: badge.color,
        priority: badge.priority,
        isActive: badge.isActive,
        createdAt: badge.createdAt.toISOString(),
        createdBy: badge.createdBy,
      },
    };
  } catch (error) {
    throw new HttpsError("internal", "Failed to create badge");
  }
});

/**
 * Callable Function: listBadges
 * Public function to list all active badges
 */
export const listBadges = onCall(async () => {
  // No authentication required - public endpoint

  try {
    const badgeRepository = new BadgeRepository(firestore);
    const useCase = new ListBadgesUseCase(badgeRepository);

    const badges = await useCase.execute();

    return {
      success: true,
      badges: badges.map((badge) => ({
        badgeId: badge.badgeId,
        name: badge.name,
        description: badge.description,
        iconUrl: badge.iconUrl,
        color: badge.color,
        priority: badge.priority,
        createdAt: badge.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    throw new HttpsError("internal", "Failed to list badges");
  }
});

/**
 * Callable Function: grantBadge
 * Moderator/Admin function to grant a badge to a user
 */
export const grantBadge = onCall(async (request) => {
  checkModeratorPermission(request);

  // Validate request data
  const {badgeId, targetUserId, reason} = request.data;

  if (!badgeId || typeof badgeId !== "string") {
    throw new HttpsError("invalid-argument", "badgeId is required and must be a string");
  }

  if (!targetUserId || typeof targetUserId !== "string") {
    throw new HttpsError("invalid-argument", "targetUserId is required and must be a string");
  }

  if (reason !== undefined && typeof reason !== "string") {
    throw new HttpsError("invalid-argument", "reason must be a string");
  }

  try {
    const badgeRepository = new BadgeRepository(firestore);
    const userRepository = new UserRepository(firestore);
    const useCase = new GrantBadgeUseCase(badgeRepository, userRepository);

    const userBadge = await useCase.execute({
      badgeId,
      targetUserId,
      grantedBy: request.auth!.uid,
      reason,
    });

    return {
      success: true,
      userBadge: {
        badgeId: userBadge.badgeId,
        grantedAt: userBadge.grantedAt.toISOString(),
        grantedBy: userBadge.grantedBy,
        reason: userBadge.reason,
        visibility: userBadge.visibility,
      },
    };
  } catch (error) {
    if (error instanceof BadgeNotFoundError) {
      throw new HttpsError("not-found", `Badge ${error.badgeId} not found`);
    }
    if (error instanceof UserNotFoundError) {
      throw new HttpsError("not-found", `User ${error.userId} not found`);
    }
    if (error instanceof BadgeAlreadyGrantedError) {
      throw new HttpsError(
        "already-exists",
        `Badge ${error.badgeId} has already been granted to user ${error.userId}`
      );
    }
    throw new HttpsError("internal", "Failed to grant badge");
  }
});

/**
 * Callable Function: revokeBadge
 * Moderator/Admin function to revoke a badge from a user
 */
export const revokeBadge = onCall(async (request) => {
  checkModeratorPermission(request);

  // Validate request data
  const {badgeId, targetUserId} = request.data;

  if (!badgeId || typeof badgeId !== "string") {
    throw new HttpsError("invalid-argument", "badgeId is required and must be a string");
  }

  if (!targetUserId || typeof targetUserId !== "string") {
    throw new HttpsError("invalid-argument", "targetUserId is required and must be a string");
  }

  try {
    const badgeRepository = new BadgeRepository(firestore);
    const userRepository = new UserRepository(firestore);
    const useCase = new RevokeBadgeUseCase(badgeRepository, userRepository);

    await useCase.execute({
      badgeId,
      targetUserId,
    });

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof BadgeNotFoundError) {
      throw new HttpsError("not-found", `Badge ${error.badgeId} not found`);
    }
    if (error instanceof UserNotFoundError) {
      throw new HttpsError("not-found", `User ${error.userId} not found`);
    }
    throw new HttpsError("internal", "Failed to revoke badge");
  }
});
