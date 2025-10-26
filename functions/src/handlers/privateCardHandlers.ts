import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {UpdatePrivateCardUseCase} from "../application/UpdatePrivateCardUseCase";
import {GetPrivateCardUseCase} from "../application/GetPrivateCardUseCase";
import {PrivateCardRepository} from "../infrastructure/PrivateCardRepository";
import {UserRepository} from "../infrastructure/UserRepository";
import {
  PRIVATE_CARD_VALIDATION,
  isValidTwitterHandle,
  normalizeTwitterHandle,
} from "../constants/validation";

const firestore = getFirestore();

/**
 * Callable function to update user's private card (contact information)
 * Only the owner can update their own private card
 */
export const updatePrivateCard = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const {email, phoneNumber, lineId, discordId, twitterHandle, otherContacts} = request.data;

  // Validate at least one field is provided
  if (
    email === undefined &&
    phoneNumber === undefined &&
    lineId === undefined &&
    discordId === undefined &&
    twitterHandle === undefined &&
    otherContacts === undefined
  ) {
    throw new HttpsError("invalid-argument", "At least one field must be provided");
  }

  // Validate email format
  if (email !== undefined) {
    if (typeof email !== "string") {
      throw new HttpsError("invalid-argument", "email must be a string");
    }
    if (email.length > PRIVATE_CARD_VALIDATION.EMAIL_MAX_LENGTH) {
      throw new HttpsError(
        "invalid-argument",
        `email must be at most ${PRIVATE_CARD_VALIDATION.EMAIL_MAX_LENGTH} characters`
      );
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.length > 0 && !emailRegex.test(email)) {
      throw new HttpsError("invalid-argument", "email must be a valid email address");
    }
  }

  // Validate phone number
  if (phoneNumber !== undefined) {
    if (typeof phoneNumber !== "string") {
      throw new HttpsError("invalid-argument", "phoneNumber must be a string");
    }
    if (phoneNumber.length > PRIVATE_CARD_VALIDATION.PHONE_NUMBER_MAX_LENGTH) {
      throw new HttpsError(
        "invalid-argument",
        `phoneNumber must be at most ${PRIVATE_CARD_VALIDATION.PHONE_NUMBER_MAX_LENGTH} characters`
      );
    }
  }

  // Validate lineId
  if (lineId !== undefined) {
    if (typeof lineId !== "string") {
      throw new HttpsError("invalid-argument", "lineId must be a string");
    }
    if (lineId.length > PRIVATE_CARD_VALIDATION.LINE_ID_MAX_LENGTH) {
      throw new HttpsError(
        "invalid-argument",
        `lineId must be at most ${PRIVATE_CARD_VALIDATION.LINE_ID_MAX_LENGTH} characters`
      );
    }
  }

  // Validate discordId
  if (discordId !== undefined) {
    if (typeof discordId !== "string") {
      throw new HttpsError("invalid-argument", "discordId must be a string");
    }
    if (discordId.length > PRIVATE_CARD_VALIDATION.DISCORD_ID_MAX_LENGTH) {
      throw new HttpsError(
        "invalid-argument",
        `discordId must be at most ${PRIVATE_CARD_VALIDATION.DISCORD_ID_MAX_LENGTH} characters`
      );
    }
  }

  // Validate and normalize twitterHandle
  let normalizedTwitterHandle: string | undefined;
  if (twitterHandle !== undefined) {
    if (typeof twitterHandle !== "string") {
      throw new HttpsError("invalid-argument", "twitterHandle must be a string");
    }
    if (twitterHandle.length > 0) {
      if (!isValidTwitterHandle(twitterHandle)) {
        throw new HttpsError(
          "invalid-argument",
          "twitterHandle must be 1-15 characters and contain only letters, numbers, and underscores (@ prefix is optional)"
        );
      }
      // Normalize: remove @ prefix
      normalizedTwitterHandle = normalizeTwitterHandle(twitterHandle);
    } else {
      // Empty string is allowed (clears the field)
      normalizedTwitterHandle = "";
    }
  }

  // Validate otherContacts
  if (otherContacts !== undefined) {
    if (typeof otherContacts !== "string") {
      throw new HttpsError("invalid-argument", "otherContacts must be a string");
    }
    if (otherContacts.length > PRIVATE_CARD_VALIDATION.OTHER_CONTACTS_MAX_LENGTH) {
      throw new HttpsError(
        "invalid-argument",
        `otherContacts must be at most ${PRIVATE_CARD_VALIDATION.OTHER_CONTACTS_MAX_LENGTH} characters`
      );
    }
  }

  try {
    // Log operation (mask PII)
    logger.info("updatePrivateCard called", {
      userId,
      hasEmail: email !== undefined,
      hasPhoneNumber: phoneNumber !== undefined,
      hasLineId: lineId !== undefined,
      hasDiscordId: discordId !== undefined,
      hasTwitterHandle: twitterHandle !== undefined,
      hasOtherContacts: otherContacts !== undefined,
    });

    // Execute use case
    const privateCardRepository = new PrivateCardRepository(firestore);
    const userRepository = new UserRepository(firestore);
    const useCase = new UpdatePrivateCardUseCase(privateCardRepository, userRepository);

    await useCase.execute({
      userId,
      email,
      phoneNumber,
      lineId,
      discordId,
      twitterHandle: normalizedTwitterHandle,
      otherContacts,
    });

    return {success: true};
  } catch (error) {
    logger.error("updatePrivateCard failed", {
      userId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
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

    throw new HttpsError("internal", "Failed to update private card");
  }
});

/**
 * Callable function to get user's own private card
 * Only the owner can access their private card
 */
export const getPrivateCard = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;

  try {
    logger.info("getPrivateCard called", {userId});

    // Execute use case
    const privateCardRepository = new PrivateCardRepository(firestore);
    const useCase = new GetPrivateCardUseCase(privateCardRepository);

    const privateCard = await useCase.execute(userId);

    if (!privateCard) {
      return null;
    }

    // Return serialized data (Date to ISO string)
    return {
      ...privateCard,
      updatedAt: privateCard.updatedAt.toISOString(),
    };
  } catch (error) {
    logger.error("getPrivateCard failed", {userId, error});
    throw new HttpsError("internal", "Failed to get private card");
  }
});
