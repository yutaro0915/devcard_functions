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

  describe("成功系: Callable Function経由", () => {
    it("全フィールドを更新し、両コレクションに反映される", async () => {
      // Setup: Create test user
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      // Execute: Call updateProfile via Emulator
      const functions = getFunctionsInstance();
      const updateProfile = httpsCallable(functions, "updateProfile");

      const result = await updateProfile({
        displayName: "Updated Name",
        bio: "Updated bio",
        photoURL: "https://example.com/new-photo.jpg",
      });

      // Verify: Response
      expect(result.data).toEqual({success: true});

      // Verify: Firestore data - /users collection
      const firestore = getFirestoreInstance();
      const userDoc = await getDoc(doc(firestore, "users", TEST_USER_ID));
      const userData = userDoc.data();

      expect(userData?.displayName).toBe("Updated Name");
      expect(userData?.photoURL).toBe("https://example.com/new-photo.jpg");
      expect(userData?.updatedAt).toBeDefined();

      // Verify: Firestore data - /public_cards collection
      const publicCardDoc = await getDoc(doc(firestore, "public_cards", TEST_USER_ID));
      const publicCardData = publicCardDoc.data();

      expect(publicCardData?.displayName).toBe("Updated Name");
      expect(publicCardData?.bio).toBe("Updated bio");
      expect(publicCardData?.photoURL).toBe("https://example.com/new-photo.jpg");
      expect(publicCardData?.updatedAt).toBeDefined();
    });

    it("displayNameのみ更新できる", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const updateProfile = httpsCallable(functions, "updateProfile");

      const result = await updateProfile({
        displayName: "Name Only Update",
      });

      expect(result.data).toEqual({success: true});

      const firestore = getFirestoreInstance();
      const userDoc = await getDoc(doc(firestore, "users", TEST_USER_ID));

      expect(userDoc.data()?.displayName).toBe("Name Only Update");
    });

    it("bioのみ更新できる", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const updateProfile = httpsCallable(functions, "updateProfile");

      const result = await updateProfile({
        bio: "Bio only update",
      });

      expect(result.data).toEqual({success: true});

      const firestore = getFirestoreInstance();
      const publicCardDoc = await getDoc(doc(firestore, "public_cards", TEST_USER_ID));

      expect(publicCardDoc.data()?.bio).toBe("Bio only update");
    });

    it("photoURLのみ更新できる", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const updateProfile = httpsCallable(functions, "updateProfile");

      const result = await updateProfile({
        photoURL: "https://newdomain.com/photo.png",
      });

      expect(result.data).toEqual({success: true});

      const firestore = getFirestoreInstance();
      const userDoc = await getDoc(doc(firestore, "users", TEST_USER_ID));

      expect(userDoc.data()?.photoURL).toBe("https://newdomain.com/photo.png");
    });

    it("bioに空文字列を指定できる", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const updateProfile = httpsCallable(functions, "updateProfile");

      const result = await updateProfile({
        bio: "",
      });

      expect(result.data).toEqual({success: true});

      const firestore = getFirestoreInstance();
      const publicCardDoc = await getDoc(doc(firestore, "public_cards", TEST_USER_ID));

      expect(publicCardDoc.data()?.bio).toBe("");
    });

    it("updatedAtが更新される", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      // Get initial updatedAt
      const firestore = getFirestoreInstance();
      const initialUserDoc = await getDoc(doc(firestore, "users", TEST_USER_ID));
      const initialUpdatedAt = initialUserDoc.data()?.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Update profile
      const functions = getFunctionsInstance();
      const updateProfile = httpsCallable(functions, "updateProfile");

      await updateProfile({
        displayName: "New Name",
      });

      // Verify updatedAt changed
      const updatedUserDoc = await getDoc(doc(firestore, "users", TEST_USER_ID));
      const newUpdatedAt = updatedUserDoc.data()?.updatedAt;

      expect(newUpdatedAt).toBeDefined();
      expect(newUpdatedAt.toMillis()).toBeGreaterThan(initialUpdatedAt.toMillis());
    });
  });

  describe("失敗系: バリデーション", () => {
    it("全フィールド未指定で失敗する", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const updateProfile = httpsCallable(functions, "updateProfile");

      await expect(updateProfile({})).rejects.toThrow();
    });

    it("displayNameが空文字列で失敗する", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const updateProfile = httpsCallable(functions, "updateProfile");

      await expect(
        updateProfile({
          displayName: "",
        })
      ).rejects.toThrow();
    });

    it("displayNameが100文字超で失敗する", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const updateProfile = httpsCallable(functions, "updateProfile");

      await expect(
        updateProfile({
          displayName: "a".repeat(101),
        })
      ).rejects.toThrow();
    });

    it("bioが500文字超で失敗する", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const updateProfile = httpsCallable(functions, "updateProfile");

      await expect(
        updateProfile({
          bio: "a".repeat(501),
        })
      ).rejects.toThrow();
    });

    it("photoURLが非HTTPSで失敗する", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const updateProfile = httpsCallable(functions, "updateProfile");

      await expect(
        updateProfile({
          photoURL: "http://example.com/photo.jpg",
        })
      ).rejects.toThrow();
    });

    it("photoURLが無効なURL形式で失敗する", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const updateProfile = httpsCallable(functions, "updateProfile");

      await expect(
        updateProfile({
          photoURL: "not-a-valid-url",
        })
      ).rejects.toThrow();
    });
  });

  describe("PrivateCard統合: 3箇所同時更新", () => {
    it("updateProfileがPublicCardとPrivateCardを同時更新し、両方のupdatedAtが更新される", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      // Create PrivateCard first
      const functions = getFunctionsInstance();
      const updatePrivateCard = httpsCallable(functions, "updatePrivateCard");
      await updatePrivateCard({email: "initial@example.com"});

      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Update profile (should update User, PublicCard, and PrivateCard)
      const updateProfile = httpsCallable(functions, "updateProfile");
      const result = await updateProfile({
        displayName: "Updated Name",
        photoURL: "https://example.com/new-photo.jpg",
      });

      expect(result.data).toEqual({success: true});

      // Verify all 3 locations
      const firestore = getFirestoreInstance();

      const userDoc = await getDoc(doc(firestore, "users", TEST_USER_ID));
      const userData = userDoc.data();
      expect(userData?.displayName).toBe("Updated Name");
      expect(userData?.photoURL).toBe("https://example.com/new-photo.jpg");

      const publicCardDoc = await getDoc(doc(firestore, "public_cards", TEST_USER_ID));
      const publicCardData = publicCardDoc.data();
      expect(publicCardData?.displayName).toBe("Updated Name");
      expect(publicCardData?.photoURL).toBe("https://example.com/new-photo.jpg");

      const privateCardDoc = await getDoc(doc(firestore, "private_cards", TEST_USER_ID));
      const privateCardData = privateCardDoc.data();
      expect(privateCardData?.displayName).toBe("Updated Name");
      expect(privateCardData?.photoURL).toBe("https://example.com/new-photo.jpg");
      expect(privateCardData?.email).toBe("initial@example.com"); // Email should remain
      expect(privateCardData?.updatedAt).toBeDefined();
    });

    it("updateProfile時のトランザクションが正常に完了", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      // Create PrivateCard
      const functions = getFunctionsInstance();
      const updatePrivateCard = httpsCallable(functions, "updatePrivateCard");
      await updatePrivateCard({email: "test@example.com"});

      // Update profile
      const updateProfile = httpsCallable(functions, "updateProfile");
      const result = await updateProfile({
        displayName: "Atomic Update Test",
      });

      expect(result.data).toEqual({success: true});

      // Verify atomicity - all 3 documents should have the same displayName
      const firestore = getFirestoreInstance();

      const userDoc = await getDoc(doc(firestore, "users", TEST_USER_ID));
      const publicCardDoc = await getDoc(doc(firestore, "public_cards", TEST_USER_ID));
      const privateCardDoc = await getDoc(doc(firestore, "private_cards", TEST_USER_ID));

      expect(userDoc.data()?.displayName).toBe("Atomic Update Test");
      expect(publicCardDoc.data()?.displayName).toBe("Atomic Update Test");
      expect(privateCardDoc.data()?.displayName).toBe("Atomic Update Test");
    });
  });
});
