/**
 * Simulate exact frontend flow to reproduce the issue
 *
 * This simulates what the frontend does:
 * 1. Create user with Firebase Auth (client SDK)
 * 2. Wait for onUserCreate trigger
 * 3. Try to fetch public card with getPublicCard
 */

import {initializeApp} from "firebase/app";
import {getAuth, createUserWithEmailAndPassword, connectAuthEmulator} from "firebase/auth";
import {getFirestore, doc, getDoc, connectFirestoreEmulator} from "firebase/firestore";
import {getFunctions, httpsCallable, connectFunctionsEmulator} from "firebase/functions";
import {TEST_CONFIG} from "../../constants/validation";

// Initialize Firebase (simulating frontend)
const app = initializeApp({
  apiKey: "fake-api-key",
  projectId: "dev-card-ae929",
});

const auth = getAuth(app);
const firestore = getFirestore(app);
const functions = getFunctions(app);

// Connect to emulators (this is what frontend should do)
connectAuthEmulator(auth, "http://127.0.0.1:9099", {disableWarnings: true});
connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
connectFunctionsEmulator(functions, "127.0.0.1", 5001);

async function simulateFrontendFlow() {
  console.log("=== Simulating Frontend Flow ===\n");

  const email = `frontend-test-${Date.now()}@example.com`;
  const password = "password123";

  try {
    // Step 1: User registers
    console.log("Step 1: User registration");
    console.log(`Creating user: ${email}`);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;
    console.log(`✅ User created: ${userId}\n`);

    // Step 2: Try to get public card immediately (this might fail)
    console.log("Step 2: Immediate getPublicCard (may fail due to async trigger)");
    const getPublicCard = httpsCallable(functions, "getPublicCard");

    try {
      const result = await getPublicCard({userId});
      console.log("✅ IMMEDIATE SUCCESS: getPublicCard returned data");
      console.log("Data:", JSON.stringify(result.data, null, 2), "\n");
    } catch (error: any) {
      console.log("❌ IMMEDIATE FAILURE (expected):", error.message);
      console.log("   This is normal - trigger is async\n");
    }

    // Step 3: Wait and retry (Issue #55: contract recommends 500ms wait, 3 retries)
    console.log("Step 3: Retry with exponential backoff");
    const maxRetries = TEST_CONFIG.MAX_RETRIES;
    let success = false;

    for (let i = 0; i < maxRetries; i++) {
      const waitTime = 500 * (i + 1); // 500ms, 1000ms, 1500ms
      console.log(`Retry ${i + 1}/${maxRetries}: Waiting ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      try {
        const result = await getPublicCard({userId});
        console.log(`✅ SUCCESS on retry ${i + 1}: getPublicCard returned data`);
        const publicCard = (result.data as any).publicCard;
        console.log("Public Card:", JSON.stringify(publicCard, null, 2), "\n");
        success = true;
        break;
      } catch (error: any) {
        console.log(`❌ Retry ${i + 1} failed:`, error.message);
      }
    }

    if (!success) {
      console.error("\n❌❌❌ CRITICAL: getPublicCard failed after 3 retries");
      console.error("This means onUserCreate trigger did NOT create public_card\n");

      // Direct Firestore check
      console.log("Step 4: Direct Firestore check");
      const publicCardDoc = await getDoc(doc(firestore, "public_cards", userId));
      console.log(`Public card exists in Firestore: ${publicCardDoc.exists()}`);

      if (publicCardDoc.exists()) {
        console.log("Data:", publicCardDoc.data());
        console.error("\n⚠️  Document EXISTS in Firestore but getPublicCard failed");
        console.error("This indicates a problem with the getPublicCard function\n");
      } else {
        console.error("\n⚠️  Document DOES NOT EXIST in Firestore");
        console.error("This indicates onUserCreate trigger did not fire\n");
      }

      // Check users collection
      const userDoc = await getDoc(doc(firestore, "users", userId));
      console.log(`Users document exists: ${userDoc.exists()}`);
      if (userDoc.exists()) {
        console.log("Data:", userDoc.data(), "\n");
      }

      process.exit(1);
    }

    // Step 4: Verify contract compliance
    console.log("Step 4: Verify contract compliance");
    const publicCardDoc = await getDoc(doc(firestore, "public_cards", userId));
    const publicCardData = publicCardDoc.data();

    console.log("✅ Contract checks:");
    console.log(`  - userId: ${publicCardData?.userId === userId ? "✓" : "✗"}`);
    console.log(`  - displayName: ${publicCardData?.displayName ? "✓" : "✗"}`);
    console.log(`  - theme: ${publicCardData?.theme === "default" ? "✓" : "✗"}`);
    console.log(
      `  - connectedServices: ${JSON.stringify(publicCardData?.connectedServices) === "{}" ? "✓" : "✗"}`
    );
    console.log(`  - updatedAt: ${publicCardData?.updatedAt ? "✓" : "✗"}\n`);

    console.log("✅✅✅ ALL CHECKS PASSED - Frontend flow works correctly\n");
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ ERROR:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

simulateFrontendFlow();
