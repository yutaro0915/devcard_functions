import {setGlobalOptions} from "firebase-functions";
import * as auth from "firebase-functions/v1/auth";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {UserRepository} from "./infrastructure/UserRepository";
import {CreateUserUseCase} from "./application/CreateUserUseCase";

// Initialize Firebase Admin
initializeApp();
const firestore = getFirestore();

// For cost control, set the maximum number of containers
setGlobalOptions({maxInstances: 10});

/**
 * Auth onCreate trigger (v1)
 * Creates a user profile in /users collection when a new user signs up
 */
export const onUserCreate = auth.user().onCreate(async (user) => {
  try {
    logger.info("Creating user profile", {userId: user.uid});

    // Initialize dependencies
    const userRepository = new UserRepository(firestore);
    const createUserUseCase = new CreateUserUseCase(userRepository);

    // Execute use case
    await createUserUseCase.execute({
      userId: user.uid,
      email: user.email || "",
      displayName: user.displayName || "Anonymous",
      photoURL: user.photoURL,
    });

    logger.info("User profile created successfully", {userId: user.uid});
  } catch (error) {
    logger.error("Failed to create user profile", {
      userId: user.uid,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - we don't want to block user creation
  }
});
