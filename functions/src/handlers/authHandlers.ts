import * as auth from "firebase-functions/v1/auth";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {UserRepository} from "../infrastructure/UserRepository";
import {CardRepository} from "../infrastructure/CardRepository";
import {CreateUserUseCase} from "../application/CreateUserUseCase";
import {SanitizeService} from "../application/SanitizeService";

const firestore = getFirestore();

/**
 * Auth onCreate trigger (v1)
 * Creates user profile in /users and card in /cards when a new user signs up
 */
export const onUserCreate = auth.user().onCreate(async (user) => {
  try {
    logger.info("Creating user profile and card", {userId: user.uid});

    // Initialize dependencies
    const userRepository = new UserRepository(firestore);
    const cardRepository = new CardRepository(firestore);
    const sanitizeService = new SanitizeService();
    const createUserUseCase = new CreateUserUseCase(userRepository);

    // Generate displayName with sanitization
    let displayName = "Anonymous";
    if (user.displayName) {
      // Use existing displayName from OAuth providers (Google/Apple)
      displayName = user.displayName;
    } else if (user.email) {
      // Extract and sanitize email prefix for email/password auth
      const emailPrefix = user.email.split("@")[0];
      displayName = sanitizeService.sanitizeDisplayName(emailPrefix);
    }

    const photoURL = user.photoURL;

    // Create user profile
    await createUserUseCase.execute({
      userId: user.uid,
      email: user.email || "",
      displayName,
      photoURL,
    });

    // Create card (replaces PublicCard creation)
    await cardRepository.create({
      userId: user.uid,
      displayName,
      photoURL,
      theme: "default",
    });

    logger.info("User profile and card created successfully", {userId: user.uid});
  } catch (error) {
    logger.error("Failed to create user profile or card", {
      userId: user.uid,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - we don't want to block user creation
  }
});
