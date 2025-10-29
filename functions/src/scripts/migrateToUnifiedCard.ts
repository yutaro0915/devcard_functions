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

      // Build unified Card with flat structure
      const unifiedCard: Partial<Card> = {
        userId,
        displayName: publicCardData.displayName,
        theme: publicCardData.theme || "default",
        visibility: {
          bio: "public",
          backgroundImageUrl: "public",
          badges: "public",
        },
        updatedAt: publicCardData.updatedAt || new Date(),
      };

      // Add optional fields only if they exist
      if (publicCardData.photoURL) unifiedCard.photoURL = publicCardData.photoURL;
      if (publicCardData.bio) unifiedCard.bio = publicCardData.bio;
      if (publicCardData.backgroundImageUrl)
        unifiedCard.backgroundImageUrl = publicCardData.backgroundImageUrl;
      if (publicCardData.customCss) unifiedCard.customCss = publicCardData.customCss;
      if (publicCardData.badges) unifiedCard.badges = publicCardData.badges;

      // Flatten private contact fields from PrivateCard (only if defined)
      if (privateCardData) {
        if (privateCardData.email) unifiedCard.email = privateCardData.email;
        if (privateCardData.phoneNumber) unifiedCard.phoneNumber = privateCardData.phoneNumber;
        if (privateCardData.lineId) unifiedCard.line = privateCardData.lineId;
        if (privateCardData.discordId) unifiedCard.discord = privateCardData.discordId;
        if (privateCardData.twitterHandle) unifiedCard.x = privateCardData.twitterHandle;
      }

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
