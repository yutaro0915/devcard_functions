import {
  setupTestEnvironment,
  teardownTestEnvironment,
  cleanupTestData,
  getFunctionsInstance,
} from "./setup";
import {httpsCallable} from "firebase/functions";
import * as admin from "firebase-admin";

interface GetPublicCardResponse {
  success: boolean;
  publicCard: {
    userId: string;
    displayName: string;
    photoURL?: string;
    bio?: string;
    connectedServices: Record<string, unknown>;
    theme: string;
    customCss?: string;
    updatedAt: string;
  };
}

describe("getPublicCard Integration Test", () => {
  let adminApp: admin.app.App;

  beforeAll(async () => {
    await setupTestEnvironment();
    // Get admin app for creating test data
    adminApp = admin.app();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  const TEST_USER_ID = "test-user-456";

  interface TestPublicCardData {
    displayName?: string;
    photoURL?: string;
    bio?: string;
    connectedServices?: Record<string, unknown>;
    theme?: string;
    customCss?: string | null;
    updatedAt?: Date;
  }

  /**
   * Helper: Create a public card using Admin SDK
   * @param {string} userId - The user ID
   * @param {TestPublicCardData} data - Optional public card data
   * @return {Promise<void>}
   */
  async function createPublicCard(userId: string, data: TestPublicCardData = {}) {
    const adminFirestore = adminApp.firestore();
    const now = new Date();

    await adminFirestore
      .collection("public_cards")
      .doc(userId)
      .set({
        userId,
        displayName: data.displayName ?? "Test User",
        photoURL: data.photoURL ?? "https://example.com/photo.jpg",
        bio: data.bio ?? "Test bio",
        connectedServices: data.connectedServices ?? {},
        theme: data.theme ?? "default",
        customCss: data.customCss ?? null,
        updatedAt: data.updatedAt ?? now,
      });
  }

  describe("成功系", () => {
    it("存在するuserIdでPublicCardが返される", async () => {
      // Setup: Create a public card
      await createPublicCard(TEST_USER_ID);

      // Execute: Call getPublicCard (no authentication required)
      const functions = getFunctionsInstance();
      const getPublicCard = httpsCallable(functions, "getPublicCard");

      const result = await getPublicCard({userId: TEST_USER_ID});

      // Verify: Response structure
      expect(result.data).toHaveProperty("success", true);
      expect(result.data).toHaveProperty("publicCard");

      const publicCard = (result.data as GetPublicCardResponse).publicCard;
      expect(publicCard.userId).toBe(TEST_USER_ID);
      expect(publicCard.displayName).toBe("Test User");
    });

    it("レスポンスに必須フィールドが含まれる（userId, displayName等）", async () => {
      await createPublicCard(TEST_USER_ID, {
        displayName: "John Doe",
        photoURL: "https://example.com/john.jpg",
        bio: "Software Engineer",
        connectedServices: {
          github: {
            serviceName: "github",
            username: "johndoe",
            profileUrl: "https://github.com/johndoe",
          },
        },
        theme: "dark",
      });

      const functions = getFunctionsInstance();
      const getPublicCard = httpsCallable(functions, "getPublicCard");

      const result = await getPublicCard({userId: TEST_USER_ID});
      const publicCard = (result.data as GetPublicCardResponse).publicCard;

      // Verify: Required fields
      expect(publicCard).toHaveProperty("userId");
      expect(publicCard).toHaveProperty("displayName");
      expect(publicCard).toHaveProperty("connectedServices");
      expect(publicCard).toHaveProperty("theme");
      expect(publicCard).toHaveProperty("updatedAt");

      // Verify: Optional fields
      expect(publicCard).toHaveProperty("photoURL");
      expect(publicCard).toHaveProperty("bio");

      // Verify: Values
      expect(publicCard.displayName).toBe("John Doe");
      expect(publicCard.photoURL).toBe("https://example.com/john.jpg");
      expect(publicCard.bio).toBe("Software Engineer");
      expect(publicCard.connectedServices).toHaveProperty("github");
      expect(publicCard.theme).toBe("dark");
    });

    it("updatedAtがISO 8601形式である", async () => {
      await createPublicCard(TEST_USER_ID);

      const functions = getFunctionsInstance();
      const getPublicCard = httpsCallable(functions, "getPublicCard");

      const result = await getPublicCard({userId: TEST_USER_ID});
      const publicCard = (result.data as GetPublicCardResponse).publicCard;

      // Verify: updatedAt is a string in ISO 8601 format
      expect(typeof publicCard.updatedAt).toBe("string");
      expect(publicCard.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // Verify: Can be parsed as a valid date
      const date = new Date(publicCard.updatedAt);
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).not.toBeNaN();
    });
  });

  describe("失敗系", () => {
    it("userIdが空文字列で invalid-argument エラー", async () => {
      const functions = getFunctionsInstance();
      const getPublicCard = httpsCallable(functions, "getPublicCard");

      try {
        await getPublicCard({userId: ""});
        fail("Should have thrown an error");
      } catch (error) {
        expect((error as {code: string}).code).toBe("functions/invalid-argument");
      }
    });

    it("userIdがnullで invalid-argument エラー", async () => {
      const functions = getFunctionsInstance();
      const getPublicCard = httpsCallable(functions, "getPublicCard");

      try {
        await getPublicCard({userId: null});
        fail("Should have thrown an error");
      } catch (error) {
        expect((error as {code: string}).code).toBe("functions/invalid-argument");
      }
    });

    it("userIdがundefinedで invalid-argument エラー", async () => {
      const functions = getFunctionsInstance();
      const getPublicCard = httpsCallable(functions, "getPublicCard");

      try {
        await getPublicCard({});
        fail("Should have thrown an error");
      } catch (error) {
        expect((error as {code: string}).code).toBe("functions/invalid-argument");
      }
    });

    it("存在しないuserIdで not-found エラー", async () => {
      const functions = getFunctionsInstance();
      const getPublicCard = httpsCallable(functions, "getPublicCard");

      try {
        await getPublicCard({userId: "non-existent-user-id"});
        fail("Should have thrown an error");
      } catch (error) {
        expect((error as {code: string}).code).toBe("functions/not-found");
      }
    });
  });
});
