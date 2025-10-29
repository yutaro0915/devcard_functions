import * as admin from "firebase-admin";
import {Card} from "../domain/Card";

/**
 * Migrate existing PublicCard and PrivateCard data to unified Card model
 * Run with: pnpm migrate:unified-card
 */
export async function migrateToUnifiedCard() {
  const firestore = admin.firestore();

  console.log("Starting migration to Unified Card Model...");

  // Get all users
  const usersSnapshot = await firestore.collection("users").get();
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;

    try {
      // Check if already migrated
      const cardDoc = await firestore.collection("cards").doc(userId).get();
      if (cardDoc.exists) {
        console.log(`  [SKIP] User ${userId} already migrated`);
        skipCount++;
        continue;
      }

      // Fetch PublicCard and PrivateCard
      const [publicCardDoc, privateCardDoc] = await Promise.all([
        firestore.collection("public_cards").doc(userId).get(),
        firestore.collection("private_cards").doc(userId).get(),
      ]);

      if (!publicCardDoc.exists) {
        console.log(`  [WARN] User ${userId} has no PublicCard, skipping`);
        skipCount++;
        continue;
      }

      const publicCardData = publicCardDoc.data()!;
      const privateCardData = privateCardDoc.exists ? privateCardDoc.data() : undefined;

      // Build privateContacts from PrivateCard data
      let privateContacts = undefined;
      if (privateCardData) {
        privateContacts = {
          email: privateCardData.email,
          phoneNumber: privateCardData.phoneNumber,
          lineId: privateCardData.lineId,
          discordId: privateCardData.discordId,
          twitterHandle: privateCardData.twitterHandle,
          otherContacts: privateCardData.otherContacts,
        };
      }

      // Build unified Card
      const unifiedCard: Card = {
        userId,
        displayName: publicCardData.displayName,
        photoURL: publicCardData.photoURL,
        bio: publicCardData.bio,
        backgroundImageUrl: publicCardData.backgroundImageUrl,
        connectedServices: publicCardData.connectedServices || {},
        theme: publicCardData.theme || "default",
        customCss: publicCardData.customCss,
        badges: publicCardData.badges,
        privateContacts,
        visibility: {
          bio: "public",
          backgroundImage: "public",
          badges: "public",
        },
        updatedAt: publicCardData.updatedAt || new Date(),
      };

      // Create /cards document
      await firestore.collection("cards").doc(userId).set(unifiedCard);

      console.log(`  [OK] Migrated user ${userId}`);
      successCount++;
    } catch (error) {
      console.error(`  [ERROR] Failed to migrate user ${userId}:`, error);
      errorCount++;
    }
  }

  console.log("\nMigration completed!");
  console.log(`  Success: ${successCount}`);
  console.log(`  Skipped: ${skipCount}`);
  console.log(`  Errors: ${errorCount}`);
}

// CLI execution
if (require.main === module) {
  admin.initializeApp();
  migrateToUnifiedCard()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
