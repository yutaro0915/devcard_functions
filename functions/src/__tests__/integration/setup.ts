import {initializeApp, getApps, deleteApp} from "firebase/app";
import {getAuth, connectAuthEmulator, signInWithEmailAndPassword, createUserWithEmailAndPassword} from "firebase/auth";
import {getFunctions, connectFunctionsEmulator} from "firebase/functions";
import {getFirestore, connectFirestoreEmulator} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "test-api-key",
  authDomain: "dev-card-ae929.firebaseapp.com",
  projectId: "dev-card-ae929",
  storageBucket: "dev-card-ae929.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};

let app: ReturnType<typeof initializeApp>;
let auth: ReturnType<typeof getAuth>;
let functions: ReturnType<typeof getFunctions>;
let db: ReturnType<typeof getFirestore>;

export async function setupTestEnvironment() {
  // Initialize Firebase app
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);
  functions = getFunctions(app); // Emulator uses us-central1 by default
  db = getFirestore(app);

  // Connect to emulators
  connectAuthEmulator(auth, "http://localhost:9099", {disableWarnings: true});
  connectFunctionsEmulator(functions, "localhost", 5001);
  connectFirestoreEmulator(db, "localhost", 8080);

  return {app, auth, functions, db};
}

export async function teardownTestEnvironment() {
  if (app) {
    await deleteApp(app);
  }
}

export async function createTestUser(email: string, password: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function signInTestUser(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export {auth, functions, db};
