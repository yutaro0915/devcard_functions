import * as auth from "firebase-functions/v1/auth";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {UserRepository} from "../infrastructure/UserRepository";
import {PublicCardRepository} from "../infrastructure/PublicCardRepository";
import {CreateUserUseCase} from "../application/CreateUserUseCase";
import {GeneratePublicCardUseCase} from "../application/GeneratePublicCardUseCase";

const firestore = getFirestore();

/**
 * Auth onCreate trigger (v1)
 * Creates user profile in /users and public card in /public_cards when a new user signs up
 */
export const onUserCreate = auth.user().onCreate(async (user) => {
  try {
    logger.info("Creating user profile and public card", {userId: user.uid});

    // Initialize dependencies
    const userRepository = new UserRepository(firestore);
    const publicCardRepository = new PublicCardRepository(firestore);
    const createUserUseCase = new CreateUserUseCase(userRepository);
    const generatePublicCardUseCase = new GeneratePublicCardUseCase(publicCardRepository);

    const displayName = user.displayName || user.email?.split('@')[0] || "Anonymous";
    const photoURL = user.photoURL;

    // Create user profile
    await createUserUseCase.execute({
      userId: user.uid,
      email: user.email || "",
      displayName,
      photoURL,
    });

    // Generate public card
    await generatePublicCardUseCase.execute({
      userId: user.uid,
      displayName,
      photoURL,
    });

    logger.info("User profile and public card created successfully", {userId: user.uid});
  } catch (error) {
    logger.error("Failed to create user profile or public card", {
      userId: user.uid,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - we don't want to block user creation
  }
});
