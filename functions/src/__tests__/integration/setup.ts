import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {setLogLevel} from "firebase/firestore";

let testEnv: RulesTestEnvironment;

/**
 * Initialize Firebase Test Environment
 * Called once before all integration tests
 */
export async function setupTestEnvironment(): Promise<RulesTestEnvironment> {
  // Suppress Firestore logs during tests
  setLogLevel("error");

  testEnv = await initializeTestEnvironment({
    projectId: "devcard-test",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: `
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /{document=**} {
              allow read, write: if true; // Allow all for testing
            }
          }
        }
      `,
    },
  });

  return testEnv;
}

/**
 * Get the test environment
 * Returns the initialized test environment
 */
export function getTestEnvironment(): RulesTestEnvironment {
  if (!testEnv) {
    throw new Error("Test environment not initialized. Call setupTestEnvironment() first.");
  }
  return testEnv;
}

/**
 * Clean up test data after each test
 */
export async function cleanupTestData(): Promise<void> {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
}

/**
 * Tear down test environment
 * Called once after all integration tests
 */
export async function teardownTestEnvironment(): Promise<void> {
  if (testEnv) {
    await testEnv.cleanup();
  }
}

/**
 * Create a test user with authenticated context
 */
export async function createTestUser(userId: string, email: string) {
  const testEnv = getTestEnvironment();
  const authenticatedContext = testEnv.authenticatedContext(userId, {
    email,
  });

  // Create user document in /users collection
  const firestore = authenticatedContext.firestore();
  const now = new Date();

  await firestore.collection("users").doc(userId).set({
    userId,
    email,
    displayName: "Test User",
    photoURL: "https://example.com/photo.jpg",
    githubAccessToken: null,
    xAccessToken: null,
    qiitaAccessToken: null,
    customCss: null,
    createdAt: now,
    updatedAt: now,
  });

  // Create public card in /public_cards collection
  await firestore.collection("public_cards").doc(userId).set({
    userId,
    displayName: "Test User",
    photoURL: "https://example.com/photo.jpg",
    bio: "Test bio",
    connectedServices: {},
    theme: "default",
    customCss: null,
    updatedAt: now,
  });

  return authenticatedContext;
}

/**
 * Get unauthenticated context for testing
 */
export function getUnauthenticatedContext() {
  const testEnv = getTestEnvironment();
  return testEnv.unauthenticatedContext();
}
