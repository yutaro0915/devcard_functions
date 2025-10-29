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

describe("Image Upload Integration Tests", () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  const TEST_USER_ID = "test-user-image-upload";
  const TEST_EMAIL = "imagetest@example.com";

  // 1x1 pixel JPEG image (Base64)
  const VALID_JPEG_BASE64 =
    "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==";

  // 1x1 pixel PNG image (Base64)
  const VALID_PNG_BASE64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  // Generate large Base64 string (>5MB)
  const LARGE_BASE64 = "A".repeat(7 * 1024 * 1024); // 7MB of 'A'

  describe("uploadProfileImage", () => {
    it("uploadProfileImage: 認証済みユーザーが正常な画像（JPEG）をアップロードできる", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const uploadProfileImage = httpsCallable(functions, "uploadProfileImage");

      const result = await uploadProfileImage({
        imageData: VALID_JPEG_BASE64,
        contentType: "image/jpeg",
      });

      const data = result.data as {success: boolean; photoURL: string};
      expect(data.success).toBe(true);
      expect(data.photoURL).toMatch(/^https:\/\/firebasestorage\.googleapis\.com/);
    });

    it("uploadProfileImage: アップロード後、/users, /cards の photoURL が更新される", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const uploadProfileImage = httpsCallable(functions, "uploadProfileImage");

      const result = await uploadProfileImage({
        imageData: VALID_JPEG_BASE64,
        contentType: "image/jpeg",
      });

      const data = result.data as {success: boolean; photoURL: string};
      const uploadedPhotoURL = data.photoURL;

      // Verify /users
      const firestore = getFirestoreInstance();
      const userDoc = await getDoc(doc(firestore, "users", TEST_USER_ID));
      expect(userDoc.data()?.photoURL).toBe(uploadedPhotoURL);

      // Verify /cards (Unified Card Model: single collection)
      const cardDoc = await getDoc(doc(firestore, "cards", TEST_USER_ID));
      expect(cardDoc.data()?.photoURL).toBe(uploadedPhotoURL);
    }, 10000); // 10 second timeout for image upload operations

    it("uploadProfileImage: 画像サイズが5MBを超える場合 invalid-argument エラー", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const uploadProfileImage = httpsCallable(functions, "uploadProfileImage");

      await expect(
        uploadProfileImage({
          imageData: LARGE_BASE64,
          contentType: "image/jpeg",
        })
      ).rejects.toThrow();
    });

    it("uploadProfileImage: 不正なContent-Type（image/svg+xml）の場合 invalid-argument エラー", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const uploadProfileImage = httpsCallable(functions, "uploadProfileImage");

      await expect(
        uploadProfileImage({
          imageData: VALID_JPEG_BASE64,
          contentType: "image/svg+xml",
        })
      ).rejects.toThrow();
    });

    it("uploadProfileImage: 未認証ユーザーは unauthenticated エラー", async () => {
      const functions = getFunctionsInstance();
      const uploadProfileImage = httpsCallable(functions, "uploadProfileImage");

      // Not creating test user = unauthenticated
      await expect(
        uploadProfileImage({
          imageData: VALID_JPEG_BASE64,
          contentType: "image/jpeg",
        })
      ).rejects.toThrow();
    });
  });

  describe("uploadCardBackground", () => {
    it("uploadCardBackground: 認証済みユーザーが背景画像（PNG）をアップロードできる", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const uploadCardBackground = httpsCallable(functions, "uploadCardBackground");

      const result = await uploadCardBackground({
        imageData: VALID_PNG_BASE64,
        contentType: "image/png",
      });

      const data = result.data as {success: boolean; backgroundImageUrl: string};
      expect(data.success).toBe(true);
      expect(data.backgroundImageUrl).toMatch(/^https:\/\/firebasestorage\.googleapis\.com/);
    });

    it("uploadCardBackground: アップロード後、/cards の backgroundImageUrl が更新される", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const uploadCardBackground = httpsCallable(functions, "uploadCardBackground");

      const result = await uploadCardBackground({
        imageData: VALID_PNG_BASE64,
        contentType: "image/png",
      });

      const data = result.data as {success: boolean; backgroundImageUrl: string};
      const uploadedBackgroundURL = data.backgroundImageUrl;

      // Verify /cards
      const firestore = getFirestoreInstance();
      const publicCardDoc = await getDoc(doc(firestore, "cards", TEST_USER_ID));
      expect(publicCardDoc.data()?.backgroundImageUrl).toBe(uploadedBackgroundURL);
    });

    it("uploadCardBackground: getPublicCard で backgroundImageUrl が返却される", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const uploadCardBackground = httpsCallable(functions, "uploadCardBackground");

      const uploadResult = await uploadCardBackground({
        imageData: VALID_PNG_BASE64,
        contentType: "image/png",
      });

      const uploadData = uploadResult.data as {success: boolean; backgroundImageUrl: string};
      const uploadedBackgroundURL = uploadData.backgroundImageUrl;

      // Call getPublicCard
      const getPublicCard = httpsCallable(functions, "getPublicCard");
      const getResult = await getPublicCard({userId: TEST_USER_ID});

      const cardData = getResult.data as {
        success: boolean;
        publicCard: {backgroundImageUrl?: string};
      };
      expect(cardData.publicCard.backgroundImageUrl).toBe(uploadedBackgroundURL);
    });

    it("uploadCardBackground: 画像サイズ超過で invalid-argument エラー", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const functions = getFunctionsInstance();
      const uploadCardBackground = httpsCallable(functions, "uploadCardBackground");

      await expect(
        uploadCardBackground({
          imageData: LARGE_BASE64,
          contentType: "image/png",
        })
      ).rejects.toThrow();
    });

    it("uploadCardBackground: 未認証ユーザーは unauthenticated エラー", async () => {
      const functions = getFunctionsInstance();
      const uploadCardBackground = httpsCallable(functions, "uploadCardBackground");

      await expect(
        uploadCardBackground({
          imageData: VALID_PNG_BASE64,
          contentType: "image/png",
        })
      ).rejects.toThrow();
    });
  });
});
