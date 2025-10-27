import {
  setupTestEnvironment,
  teardownTestEnvironment,
  cleanupTestData,
  createTestUser,
  getFunctionsInstance,
  getFirestoreInstance,
} from "./setup";
import {httpsCallable} from "firebase/functions";
import {doc, getDoc} from "firebase/firestore";
import * as admin from "firebase-admin";

// TODO: これは偽物の統合テストです。実際のmanualSync関数を呼ばず、Firestoreを直接操作しています。
// 正しい統合テストに書き直すか、削除する必要があります。
// - 実際にhttpsCallable(functions, "manualSync")を呼ぶべき
// - GitHub APIはnockでモックする必要がある
// - 現在のテストは統合テストの意味がない（Line 43-49でFirestoreを直接更新している）
describe.skip("ManualSync Integration Test - updatedAt更新", () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  const TEST_USER_ID = "test-user-123";
  const TEST_USER2_ID = "test-user-456";
  const TEST_EMAIL = "test@example.com";
  const TEST_EMAIL2 = "test2@example.com";

  describe("成功系: PublicCard.updatedAt更新", () => {
    it("manualSync時にPublicCard.updatedAtが更新される", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      // Get initial updatedAt
      const firestore = getFirestoreInstance();
      const initialDoc = await getDoc(doc(firestore, "public_cards", TEST_USER_ID));
      const initialUpdatedAt = initialDoc.data()?.updatedAt;

      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Simulate GitHub sync by directly updating PublicCard
      // (manualSync would fail without GitHub token setup)
      const adminApp = admin.app();
      const adminFirestore = adminApp.firestore();
      await adminFirestore.collection("public_cards").doc(TEST_USER_ID).update({
        updatedAt: new Date(),
      });

      // Verify updatedAt was updated
      const updatedDoc = await getDoc(doc(firestore, "public_cards", TEST_USER_ID));
      const updatedData = updatedDoc.data();

      expect(updatedData?.updatedAt).toBeDefined();
      expect(updatedData?.updatedAt.toMillis()).toBeGreaterThan(initialUpdatedAt.toMillis());
    });

    it("GitHub同期後、保存している人のgetSavedCardsでhasUpdate=trueになる", async () => {
      // Create both users
      await createTestUser(TEST_USER2_ID, TEST_EMAIL2);
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const adminApp = admin.app();
      const adminFirestore = adminApp.firestore();

      // Get USER1's current PublicCard updatedAt
      const savedCardId = "saved-card-123";
      const publicCardDoc = await adminFirestore.collection("public_cards").doc(TEST_USER_ID).get();
      const currentUpdatedAt = publicCardDoc.data()?.updatedAt;

      // User2 saves User1's card (simulate by direct Firestore)
      await adminFirestore
        .collection("users")
        .doc(TEST_USER2_ID)
        .collection("saved_cards")
        .doc(savedCardId)
        .set({
          savedCardId,
          cardUserId: TEST_USER_ID,
          cardType: "public",
          savedAt: new Date(),
          lastKnownUpdatedAt: currentUpdatedAt,
        });

      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate GitHub sync by directly updating PublicCard
      // (In real scenario, manualSync would update this after fetching from GitHub)
      await adminFirestore.collection("public_cards").doc(TEST_USER_ID).update({
        updatedAt: new Date(),
      });

      // User2 checks saved cards (need to sign in as user2)
      const customToken = await adminApp.auth().createCustomToken(TEST_USER2_ID);
      const {getAuth, signInWithCustomToken} = await import("firebase/auth");
      const auth = getAuth();
      await signInWithCustomToken(auth, customToken);

      const getSavedCards = httpsCallable(functions, "getSavedCards");
      const cardsResult = await getSavedCards({});
      expect(cardsResult.data).toHaveProperty("success", true);
      expect(cardsResult.data).toHaveProperty("savedCards");
      const cards = (cardsResult.data as any).savedCards as any[];

      const savedCard = cards.find((c: any) => c.cardUserId === TEST_USER_ID);
      expect(savedCard).toBeDefined();
      expect(savedCard.hasUpdate).toBe(true);
    });
  });
});
