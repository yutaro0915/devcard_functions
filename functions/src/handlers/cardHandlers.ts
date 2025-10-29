import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {UpdateCardUseCase} from "../application/UpdateCardUseCase";
import {CardRepository} from "../infrastructure/CardRepository";
import {UserRepository} from "../infrastructure/UserRepository";
import {UserNotFoundError} from "../domain/errors/DomainErrors";
import {
  PROFILE_VALIDATION,
  PRIVATE_CARD_VALIDATION,
  isValidTwitterHandle,
  normalizeTwitterHandle,
} from "../constants/validation";

const firestore = getFirestore();

/**
 * Unified callable function to update card (all fields)
 * Replaces updateProfile and updatePrivateCard
 */
export const updateCard = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;
  const {
    displayName,
    bio,
    photoURL,
    backgroundImageUrl,
    email,
    phoneNumber,
    line,
    discord,
    telegram,
    slack,
    github,
    x,
    linkedin,
    instagram,
    facebook,
    zenn,
    qiita,
    website,
    blog,
    youtube,
    twitch,
    otherContacts,
    theme,
    customCss,
  } = request.data;

  // Validate at least one field is provided
  const hasAnyField = Object.keys(request.data).length > 0;
  if (!hasAnyField) {
    throw new HttpsError("invalid-argument", "At least one field must be provided");
  }

  // Validate displayName
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

  // Validate bio
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

  // Validate photoURL
  if (photoURL !== undefined) {
    if (typeof photoURL !== "string") {
      throw new HttpsError("invalid-argument", "photoURL must be a string");
    }
    try {
      const url = new URL(photoURL);
      if (url.protocol !== "https:") {
        throw new HttpsError("invalid-argument", "photoURL must use HTTPS protocol");
      }
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("invalid-argument", "photoURL must be a valid URL");
    }
  }

  // Validate email
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.length > 0 && !emailRegex.test(email)) {
      throw new HttpsError("invalid-argument", "email must be a valid email address");
    }
  }

  // Validate phoneNumber
  if (phoneNumber !== undefined && typeof phoneNumber !== "string") {
    throw new HttpsError("invalid-argument", "phoneNumber must be a string");
  }
  if (phoneNumber && phoneNumber.length > PRIVATE_CARD_VALIDATION.PHONE_NUMBER_MAX_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `phoneNumber must be at most ${PRIVATE_CARD_VALIDATION.PHONE_NUMBER_MAX_LENGTH} characters`
    );
  }

  // Validate messaging fields
  const messagingFields = {line, discord, telegram, slack};
  for (const [field, value] of Object.entries(messagingFields)) {
    if (value !== undefined && typeof value !== "string") {
      throw new HttpsError("invalid-argument", `${field} must be a string`);
    }
    if (value && value.length > 100) {
      throw new HttpsError("invalid-argument", `${field} must be at most 100 characters`);
    }
  }

  // Validate x (Twitter handle)
  let normalizedX: string | undefined = x;
  if (x !== undefined) {
    if (typeof x !== "string") {
      throw new HttpsError("invalid-argument", "x must be a string");
    }
    if (x.length > 0) {
      if (!isValidTwitterHandle(x)) {
        throw new HttpsError(
          "invalid-argument",
          "x must be a valid Twitter/X handle (1-15 alphanumeric characters or underscore)"
        );
      }
      normalizedX = normalizeTwitterHandle(x);
    }
  }

  // Validate otherContacts
  if (otherContacts !== undefined && typeof otherContacts !== "string") {
    throw new HttpsError("invalid-argument", "otherContacts must be a string");
  }
  if (otherContacts && otherContacts.length > PRIVATE_CARD_VALIDATION.OTHER_CONTACTS_MAX_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `otherContacts must be at most ${PRIVATE_CARD_VALIDATION.OTHER_CONTACTS_MAX_LENGTH} characters`
    );
  }

  try {
    logger.info("Updating card", {userId});

    const cardRepository = new CardRepository(firestore);
    const userRepository = new UserRepository(firestore);
    const updateCardUseCase = new UpdateCardUseCase(cardRepository, userRepository);

    await updateCardUseCase.execute({
      userId,
      displayName,
      bio,
      photoURL,
      backgroundImageUrl,
      email,
      phoneNumber,
      line,
      discord,
      telegram,
      slack,
      github,
      x: normalizedX,
      linkedin,
      instagram,
      facebook,
      zenn,
      qiita,
      website,
      blog,
      youtube,
      twitch,
      otherContacts,
      theme,
      customCss,
    });

    logger.info("Card updated successfully", {userId});

    return {success: true};
  } catch (error) {
    logger.error("Failed to update card", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof HttpsError) throw error;
    if (error instanceof UserNotFoundError) {
      throw new HttpsError("not-found", error.message);
    }

    throw new HttpsError("internal", "Failed to update card");
  }
});
