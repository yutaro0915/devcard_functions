import {initializeApp, deleteApp} from "firebase/app";
import {connectFunctionsEmulator, getFunctions} from "firebase/functions";
import {connectFirestoreEmulator, getFirestore} from "firebase/firestore";
import {connectAuthEmulator, getAuth, signInWithCustomToken} from "firebase/auth";
import type {FirebaseApp} from "firebase/app";
import type {Functions} from "firebase/functions";
import type {Firestore} from "firebase/firestore";
import type {Auth, User} from "firebase/auth";
import * as admin from "firebase-admin";

let app: FirebaseApp;
let functions: Functions;
let firestore: Firestore;
let auth: Auth;
let currentUser: User | null = null;
let adminApp: admin.app.App;

/**
 * Initialize Firebase Test Environment
 * Called once before all integration tests
 */
export async function setupTestEnvironment(): Promise<void> {
  // Set environment variables for Admin SDK to use emulators
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
  process.env.GCLOUD_PROJECT = "dev-card-ae929";

  // Initialize Admin SDK for creating custom tokens
  adminApp = admin.initializeApp({
    projectId: "dev-card-ae929",
    storageBucket: "dev-card-ae929.appspot.com",
  });

  // Initialize Firebase app
  app = initializeApp({
    projectId: "dev-card-ae929",
    apiKey: "fake-api-key",
  });

  // Connect to emulators
  functions = getFunctions(app);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);

  firestore = getFirestore(app);
  connectFirestoreEmulator(firestore, "127.0.0.1", 8080);

  auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", {disableWarnings: true});
}

/**
 * Get Firebase Functions instance
 */
export function getFunctionsInstance(): Functions {
  if (!functions) {
    throw new Error("Functions not initialized. Call setupTestEnvironment() first.");
  }
  return functions;
}

/**
 * Get Firestore instance
 */
export function getFirestoreInstance(): Firestore {
  if (!firestore) {
    throw new Error("Firestore not initialized. Call setupTestEnvironment() first.");
  }
  return firestore;
}

/**
 * Get Auth instance
 */
export function getAuthInstance(): Auth {
  if (!auth) {
    throw new Error("Auth not initialized. Call setupTestEnvironment() first.");
  }
  return auth;
}

/**
 * Clean up test data after each test
 */
export async function cleanupTestData(): Promise<void> {
  if (!adminApp) return;

  const adminFirestore = adminApp.firestore();

  // Clear subcollections FIRST (before deleting parent documents)
  const usersSnapshot = await adminFirestore.collection("users").get();
  for (const userDoc of usersSnapshot.docs) {
    // Clear saved_cards subcollection
    const savedCardsSnapshot = await adminFirestore
      .collection(`users/${userDoc.id}/saved_cards`)
      .get();
    await Promise.all(savedCardsSnapshot.docs.map((d) => d.ref.delete()));

    // Clear badges subcollection
    const badgesSnapshot = await adminFirestore.collection(`users/${userDoc.id}/badges`).get();
    await Promise.all(badgesSnapshot.docs.map((d) => d.ref.delete()));
  }

  // Then clear all top-level collections using Admin SDK
  const collections = [
    "users",
    "public_cards",
    "private_cards",
    "exchange_tokens",
    "badges",
    "moderators",
  ];
  for (const collectionName of collections) {
    const snapshot = await adminFirestore.collection(collectionName).get();
    await Promise.all(snapshot.docs.map((d) => d.ref.delete()));
  }

  // Sign out if signed in
  if (currentUser && auth) {
    await auth.signOut();
    currentUser = null;
  }
}

/**
 * Tear down test environment
 * Called once after all integration tests
 */
export async function teardownTestEnvironment(): Promise<void> {
  if (auth && currentUser) {
    await auth.signOut();
  }
  if (app) {
    await deleteApp(app);
  }
  if (adminApp) {
    await adminApp.delete();
  }
}

/**
 * Create a test user with authenticated context
 */
export async function createTestUser(userId: string, email: string): Promise<User> {
  if (!auth || !firestore || !adminApp) {
    throw new Error("Auth/Firestore/Admin not initialized");
  }

  // Create custom token with the specified userId
  const customToken = await adminApp.auth().createCustomToken(userId);

  // Sign in with custom token so that auth.uid matches userId
  const userCredential = await signInWithCustomToken(auth, customToken);
  currentUser = userCredential.user;

  // Create user document in /users collection using Admin SDK
  const now = new Date();
  const adminFirestore = adminApp.firestore();

  await adminFirestore.collection("users").doc(userId).set({
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

  // Create public card in /public_cards collection using Admin SDK
  await adminFirestore.collection("public_cards").doc(userId).set({
    userId,
    displayName: "Test User",
    photoURL: "https://example.com/photo.jpg",
    bio: "Test bio",
    connectedServices: {},
    theme: "default",
    customCss: null,
    updatedAt: now,
  });

  return currentUser;
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): User | null {
  return currentUser;
}
