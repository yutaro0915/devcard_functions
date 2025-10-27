/**
 * Manual test to verify onUserCreate trigger works in emulator
 *
 * CONTRACT: contracts/API_CONTRACT.md lines 11-60
 *
 * EXPECTED BEHAVIOR:
 * 1. Create user with Firebase Auth
 * 2. onUserCreate trigger fires automatically
 * 3. /users/{userId} document created
 * 4. /public_cards/{userId} document created
 */

import * as admin from "firebase-admin";
import {getAuth} from "firebase-admin/auth";

// Connect to emulator
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

const app = admin.initializeApp({
  projectId: "dev-card-ae929",
});

const auth = getAuth(app);
const firestore = admin.firestore(app);

async function testAuthTrigger() {
  console.log("=== Testing onUserCreate Trigger ===\n");

  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "password123";

  try {
    // Step 1: Create user
    console.log(`Step 1: Creating user with email: ${testEmail}`);
    const userRecord = await auth.createUser({
      email: testEmail,
      password: testPassword,
      // Don't set displayName - let trigger handle it
    });

    console.log(`✅ User created: ${userRecord.uid}`);
    console.log(`   Email: ${userRecord.email}`);
    console.log(`   DisplayName: ${userRecord.displayName || "(null)"}\n`);

    // Step 2: Wait for trigger (async)
    console.log("Step 2: Waiting for onUserCreate trigger (3 seconds)...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Step 3: Check /users/{userId}
    console.log(`Step 3: Checking /users/${userRecord.uid}`);
    const userDoc = await firestore.collection("users").doc(userRecord.uid).get();

    if (!userDoc.exists) {
      console.error("❌ FAILED: /users document NOT created");
      console.error("   Expected: Contract specifies /users/{userId} must be created");
      console.error("   Actual: Document does not exist\n");
    } else {
      console.log("✅ /users document exists");
      const userData = userDoc.data();
      console.log("   Data:", JSON.stringify(userData, null, 2));

      // Verify contract compliance
      const expectedPrefix = testEmail.split("@")[0]; // "test-{timestamp}"
      const sanitized = expectedPrefix.replace(/[^a-zA-Z0-9]/g, ""); // Remove "-"

      if (userData?.displayName !== sanitized) {
        console.warn("⚠️  DisplayName mismatch:");
        console.warn(`   Expected (sanitized): ${sanitized}`);
        console.warn(`   Actual: ${userData?.displayName}\n`);
      } else {
        console.log(`   DisplayName correctly sanitized: ${userData?.displayName}\n`);
      }
    }

    // Step 4: Check /public_cards/{userId}
    console.log(`Step 4: Checking /public_cards/${userRecord.uid}`);
    const publicCardDoc = await firestore.collection("public_cards").doc(userRecord.uid).get();

    if (!publicCardDoc.exists) {
      console.error("❌ FAILED: /public_cards document NOT created");
      console.error("   Expected: Contract specifies /public_cards/{userId} must be created");
      console.error("   Actual: Document does not exist\n");
    } else {
      console.log("✅ /public_cards document exists");
      const publicCardData = publicCardDoc.data();
      console.log("   Data:", JSON.stringify(publicCardData, null, 2));

      // Verify contract compliance
      if (publicCardData?.theme !== "default") {
        console.error("❌ Theme mismatch:");
        console.error("   Expected: default");
        console.error(`   Actual: ${publicCardData?.theme}\n`);
      }

      if (JSON.stringify(publicCardData?.connectedServices) !== "{}") {
        console.error("❌ ConnectedServices mismatch:");
        console.error("   Expected: {}");
        console.error(`   Actual: ${JSON.stringify(publicCardData?.connectedServices)}\n`);
      }
    }

    // Step 5: Cleanup
    console.log("\nStep 5: Cleanup");
    await firestore.collection("users").doc(userRecord.uid).delete();
    await firestore.collection("public_cards").doc(userRecord.uid).delete();
    await auth.deleteUser(userRecord.uid);
    console.log("✅ Cleanup complete\n");

    // Final verdict
    if (userDoc.exists && publicCardDoc.exists) {
      console.log("✅✅✅ TEST PASSED: onUserCreate trigger is working correctly\n");
      process.exit(0);
    } else {
      console.log("❌❌❌ TEST FAILED: onUserCreate trigger did NOT fire\n");
      console.log("POSSIBLE CAUSES:");
      console.log("1. Functions emulator not running");
      console.log("2. onUserCreate not deployed to emulator");
      console.log("3. Auth trigger using v1 API (may not work in some emulator versions)");
      console.log("4. Build errors preventing function deployment\n");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ ERROR:", error);
    process.exit(1);
  }
}

testAuthTrigger();
