/**
 * Check specific user reported by frontend
 * User ID: Xu5o6jtsR8n7aCKGIdgiUOvx6ykj
 */

import * as admin from "firebase-admin";

// Connect to emulator
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

const app = admin.initializeApp({
  projectId: "dev-card-ae929",
});

const auth = admin.auth(app);
const firestore = admin.firestore(app);

async function checkUser() {
  const userId = "Xu5o6jtsR8n7aCKGIdgiUOvx6ykj";

  console.log(`=== Checking User: ${userId} ===\n`);

  // Check if user exists in Auth
  try {
    const userRecord = await auth.getUser(userId);
    console.log("✅ User EXISTS in Firebase Auth");
    console.log(`   Email: ${userRecord.email}`);
    console.log(`   DisplayName: ${userRecord.displayName || "(null)"}`);
    console.log(`   Created: ${new Date(userRecord.metadata.creationTime).toISOString()}\n`);
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      console.log("❌ User NOT FOUND in Firebase Auth");
      console.log("   This means the user was never created, or was deleted\n");
    } else {
      console.error("❌ Error checking Auth:", error.message);
    }
  }

  // Check /users/{userId}
  const userDoc = await firestore.collection("users").doc(userId).get();
  if (userDoc.exists) {
    console.log("✅ /users document EXISTS");
    console.log("   Data:", JSON.stringify(userDoc.data(), null, 2), "\n");
  } else {
    console.log("❌ /users document NOT FOUND");
    console.log("   This means onUserCreate trigger did NOT fire\n");
  }

  // Check /public_cards/{userId}
  const publicCardDoc = await firestore.collection("public_cards").doc(userId).get();
  if (publicCardDoc.exists) {
    console.log("✅ /public_cards document EXISTS");
    console.log("   Data:", JSON.stringify(publicCardDoc.data(), null, 2), "\n");
  } else {
    console.log("❌ /public_cards document NOT FOUND");
    console.log("   This means onUserCreate trigger did NOT fire\n");
  }

  // List all users in Auth (to see if any users exist)
  console.log("=== Listing ALL users in Auth Emulator ===");
  const listUsersResult = await auth.listUsers();
  console.log(`Total users: ${listUsersResult.users.length}`);
  listUsersResult.users.forEach((user) => {
    console.log(`  - ${user.uid}: ${user.email}`);
  });

  process.exit(0);
}

checkUser();
