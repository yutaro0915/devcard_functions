import {
  setupTestEnvironment,
  teardownTestEnvironment,
  cleanupTestData,
  createTestUser,
  getTestEnvironment,
} from "./setup";
import {UpdateProfileUseCase} from "../../application/UpdateProfileUseCase";
import {ProfileUpdateTransaction} from "../../infrastructure/ProfileUpdateTransaction";
import {getFirestore} from "firebase-admin/firestore";

// Initialize Firestore for integration tests
const firestore = getFirestore();

describe("updateProfile Integration Test", () => {
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
  const TEST_EMAIL = "test@example.com";

  describe("成功系: Firestore統合", () => {
    it("全フィールドを更新し、両コレクションに反映される", async () => {
      // Setup: Create test user
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      // Execute: Call UseCase with real Firestore
      const transaction = new ProfileUpdateTransaction(firestore);
      const useCase = new UpdateProfileUseCase(transaction);

      await useCase.execute({
        userId: TEST_USER_ID,
        displayName: "Updated Name",
        bio: "Updated bio",
        photoURL: "https://example.com/new-photo.jpg",
      });

      // Verify: Firestore data - /users collection
      const testEnv = getTestEnvironment();
      const testFirestore = testEnv.authenticatedContext(TEST_USER_ID).firestore();
      const userDoc = await testFirestore.collection("users").doc(TEST_USER_ID).get();
      const userData = userDoc.data();

      expect(userData?.displayName).toBe("Updated Name");
      expect(userData?.photoURL).toBe("https://example.com/new-photo.jpg");
      expect(userData?.updatedAt).toBeDefined();

      // Verify: Firestore data - /public_cards collection
      const publicCardDoc = await testFirestore
        .collection("public_cards")
        .doc(TEST_USER_ID)
        .get();
      const publicCardData = publicCardDoc.data();

      expect(publicCardData?.displayName).toBe("Updated Name");
      expect(publicCardData?.bio).toBe("Updated bio");
      expect(publicCardData?.photoURL).toBe("https://example.com/new-photo.jpg");
      expect(publicCardData?.updatedAt).toBeDefined();
    });

    it("displayNameのみ更新できる", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const transaction = new ProfileUpdateTransaction(firestore);
      const useCase = new UpdateProfileUseCase(transaction);

      await useCase.execute({
        userId: TEST_USER_ID,
        displayName: "Name Only Update",
      });

      const testEnv = getTestEnvironment();
      const testFirestore = testEnv.authenticatedContext(TEST_USER_ID).firestore();
      const userDoc = await testFirestore.collection("users").doc(TEST_USER_ID).get();

      expect(userDoc.data()?.displayName).toBe("Name Only Update");
    });

    it("bioのみ更新できる", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const transaction = new ProfileUpdateTransaction(firestore);
      const useCase = new UpdateProfileUseCase(transaction);

      await useCase.execute({
        userId: TEST_USER_ID,
        bio: "Bio only update",
      });

      const testEnv = getTestEnvironment();
      const testFirestore = testEnv.authenticatedContext(TEST_USER_ID).firestore();
      const publicCardDoc = await testFirestore
        .collection("public_cards")
        .doc(TEST_USER_ID)
        .get();

      expect(publicCardDoc.data()?.bio).toBe("Bio only update");
    });

    it("photoURLのみ更新できる", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const transaction = new ProfileUpdateTransaction(firestore);
      const useCase = new UpdateProfileUseCase(transaction);

      await useCase.execute({
        userId: TEST_USER_ID,
        photoURL: "https://newdomain.com/photo.png",
      });

      const testEnv = getTestEnvironment();
      const testFirestore = testEnv.authenticatedContext(TEST_USER_ID).firestore();
      const userDoc = await testFirestore.collection("users").doc(TEST_USER_ID).get();

      expect(userDoc.data()?.photoURL).toBe("https://newdomain.com/photo.png");
    });

    it("bioに空文字列を指定できる", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const transaction = new ProfileUpdateTransaction(firestore);
      const useCase = new UpdateProfileUseCase(transaction);

      await useCase.execute({
        userId: TEST_USER_ID,
        bio: "",
      });

      const testEnv = getTestEnvironment();
      const testFirestore = testEnv.authenticatedContext(TEST_USER_ID).firestore();
      const publicCardDoc = await testFirestore
        .collection("public_cards")
        .doc(TEST_USER_ID)
        .get();

      expect(publicCardDoc.data()?.bio).toBe("");
    });

    it("updatedAtが更新される", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      // Get initial updatedAt
      const testEnv = getTestEnvironment();
      const testFirestore = testEnv.authenticatedContext(TEST_USER_ID).firestore();
      const initialUserDoc = await testFirestore
        .collection("users")
        .doc(TEST_USER_ID)
        .get();
      const initialUpdatedAt = initialUserDoc.data()?.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Update profile
      const transaction = new ProfileUpdateTransaction(firestore);
      const useCase = new UpdateProfileUseCase(transaction);

      await useCase.execute({
        userId: TEST_USER_ID,
        displayName: "New Name",
      });

      // Verify updatedAt changed
      const updatedUserDoc = await testFirestore.collection("users").doc(TEST_USER_ID).get();
      const newUpdatedAt = updatedUserDoc.data()?.updatedAt;

      expect(newUpdatedAt).toBeDefined();
      expect(newUpdatedAt.toMillis()).toBeGreaterThan(initialUpdatedAt.toMillis());
    });
  });

  describe("失敗系: データ不整合", () => {
    it("ユーザーが存在しない場合に失敗する", async () => {
      const transaction = new ProfileUpdateTransaction(firestore);
      const useCase = new UpdateProfileUseCase(transaction);

      await expect(
        useCase.execute({
          userId: "non-existent-user",
          displayName: "Test",
        })
      ).rejects.toThrow("User with ID non-existent-user not found");
    });

    it("PublicCardが存在しない場合に失敗する", async () => {
      // Create only user, not public card
      const testEnv = getTestEnvironment();
      const testFirestore = testEnv.authenticatedContext(TEST_USER_ID).firestore();

      await testFirestore.collection("users").doc(TEST_USER_ID).set({
        userId: TEST_USER_ID,
        email: TEST_EMAIL,
        displayName: "Test User",
        photoURL: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const transaction = new ProfileUpdateTransaction(firestore);
      const useCase = new UpdateProfileUseCase(transaction);

      await expect(
        useCase.execute({
          userId: TEST_USER_ID,
          displayName: "Test",
        })
      ).rejects.toThrow(`PublicCard for user ${TEST_USER_ID} not found`);
    });

    it("アトミック更新: 両方のコレクションが同時に更新される", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const transaction = new ProfileUpdateTransaction(firestore);
      const useCase = new UpdateProfileUseCase(transaction);

      // This should succeed and update both collections
      await useCase.execute({
        userId: TEST_USER_ID,
        displayName: "Atomic Test",
      });

      const testEnv = getTestEnvironment();
      const testFirestore = testEnv.authenticatedContext(TEST_USER_ID).firestore();

      // Verify both were updated
      const userDoc = await testFirestore.collection("users").doc(TEST_USER_ID).get();
      const publicCardDoc = await testFirestore
        .collection("public_cards")
        .doc(TEST_USER_ID)
        .get();

      expect(userDoc.data()?.displayName).toBe("Atomic Test");
      expect(publicCardDoc.data()?.displayName).toBe("Atomic Test");
    });
  });
});
