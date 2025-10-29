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

describe("PrivateCard Integration Test", () => {
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

  describe("updateCard", () => {
    describe("成功系", () => {
      it("有効な連絡先情報でPrivateCardが作成される", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updateCard = httpsCallable(functions, "updateCard");

        const result = await updateCard({
          email: "private@example.com",
          phoneNumber: "+81-90-1234-5678",
          line: "test_line_id",
        });

        expect(result.data).toEqual({success: true});

        // Verify Firestore data (privateContacts is now nested)
        const firestore = getFirestoreInstance();
        const privateCardDoc = await getDoc(doc(firestore, "cards", TEST_USER_ID));
        const privateCardData = privateCardDoc.data();

        expect(privateCardData?.email).toBe("private@example.com");
        expect(privateCardData?.phoneNumber).toBe("+81-90-1234-5678");
        expect(privateCardData?.line).toBe("test_line_id");
        expect(privateCardData?.updatedAt).toBeDefined();
        expect(privateCardData?.displayName).toBe("Test User");
        expect(privateCardData?.photoURL).toBe("https://example.com/photo.jpg");
      });

      it("既存のPrivateCardが正しく更新され、updatedAtが更新される", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updateCard = httpsCallable(functions, "updateCard");

        // Initial update
        await updateCard({email: "initial@example.com"});

        // Wait to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Get initial updatedAt
        const firestore = getFirestoreInstance();
        const initialDoc = await getDoc(doc(firestore, "cards", TEST_USER_ID));
        const initialUpdatedAt = initialDoc.data()?.updatedAt;

        // Second update
        const result = await updateCard({email: "updated@example.com"});

        expect(result.data).toEqual({success: true});

        const updatedDoc = await getDoc(doc(firestore, "cards", TEST_USER_ID));
        const updatedData = updatedDoc.data();

        expect(updatedData?.email).toBe("updated@example.com");
        expect(updatedData?.updatedAt.toMillis()).toBeGreaterThan(initialUpdatedAt.toMillis());
      });

      it("部分更新が正しく動作し、updatedAtが更新される", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updateCard = httpsCallable(functions, "updateCard");

        // Create with multiple fields
        await updateCard({
          email: "test@example.com",
          phoneNumber: "+81-90-1234-5678",
          line: "test_line",
        });

        // Partial update - only email
        const result = await updateCard({email: "new@example.com"});

        expect(result.data).toEqual({success: true});

        const firestore = getFirestoreInstance();
        const updatedDoc = await getDoc(doc(firestore, "cards", TEST_USER_ID));
        const updatedData = updatedDoc.data();

        // Email should be updated
        expect(updatedData?.email).toBe("new@example.com");
        // Other fields should remain
        expect(updatedData?.phoneNumber).toBe("+81-90-1234-5678");
        expect(updatedData?.line).toBe("test_line");
      });

      it("twitterHandle に空文字列を送信すると undefined で保存される", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updateCard = httpsCallable(functions, "updateCard");

        // First, create with twitterHandle
        await updateCard({twitterHandle: "testuser"});

        const firestore = getFirestoreInstance();
        let privateCardDoc = await getDoc(doc(firestore, "cards", TEST_USER_ID));
        let privateCardData = privateCardDoc.data();
        expect(privateCardData?.x).toBe("testuser");

        // Then, send empty string to delete the field
        const result = await updateCard({twitterHandle: ""});
        expect(result.data).toEqual({success: true});

        // Verify twitterHandle is now undefined (not stored in Firestore)
        privateCardDoc = await getDoc(doc(firestore, "cards", TEST_USER_ID));
        privateCardData = privateCardDoc.data();
        expect(privateCardData?.x).toBeUndefined();
      });

      it("twitterHandle に 'testuser' を送信すると正規化されて保存される", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updateCard = httpsCallable(functions, "updateCard");

        const result = await updateCard({twitterHandle: "testuser"});
        expect(result.data).toEqual({success: true});

        const firestore = getFirestoreInstance();
        const privateCardDoc = await getDoc(doc(firestore, "cards", TEST_USER_ID));
        const privateCardData = privateCardDoc.data();
        expect(privateCardData?.x).toBe("testuser");
      });

      it("twitterHandle に '@testuser' を送信すると '@' が除去されて保存される", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updateCard = httpsCallable(functions, "updateCard");

        const result = await updateCard({twitterHandle: "@testuser"});
        expect(result.data).toEqual({success: true});

        const firestore = getFirestoreInstance();
        const privateCardDoc = await getDoc(doc(firestore, "cards", TEST_USER_ID));
        const privateCardData = privateCardDoc.data();
        expect(privateCardData?.x).toBe("testuser");
      });
    });

    describe("失敗系", () => {
      it("未ログイン時に unauthenticated エラー", async () => {
        // Don't create test user - not authenticated
        const functions = getFunctionsInstance();
        const updateCard = httpsCallable(functions, "updateCard");

        await expect(updateCard({email: "test@example.com"})).rejects.toThrow();
      });

      it("全フィールド未指定で invalid-argument エラー", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updateCard = httpsCallable(functions, "updateCard");

        await expect(updateCard({})).rejects.toThrow();
      });

      it("emailが無効な形式で invalid-argument エラー", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updateCard = httpsCallable(functions, "updateCard");

        await expect(updateCard({email: "invalid-email"})).rejects.toThrow();
      });

      it("文字列が最大長を超えて invalid-argument エラー", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updateCard = httpsCallable(functions, "updateCard");

        // phoneNumber max: 50
        await expect(updateCard({phoneNumber: "a".repeat(51)})).rejects.toThrow();

        // line max: 100
        await expect(updateCard({line: "a".repeat(101)})).rejects.toThrow();

        // otherContacts max: 1000
        await expect(updateCard({otherContacts: "a".repeat(1001)})).rejects.toThrow();
      });
    });
  });

  describe("getPrivateCard", () => {
    describe("成功系", () => {
      it("自分のPrivateCardが正しく取得できる", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updateCard = httpsCallable(functions, "updateCard");
        const getPrivateCard = httpsCallable(functions, "getPrivateCard");

        // Create private card
        await updateCard({
          email: "test@example.com",
          phoneNumber: "+81-90-1234-5678",
          line: "test_line",
          discord: "test_discord",
          twitterHandle: "@test",
          otherContacts: "Slack: test_slack",
        });

        // Get private card
        const result = await getPrivateCard({});

        expect(result.data).toMatchObject({
          userId: TEST_USER_ID,
          displayName: "Test User",
          photoURL: "https://example.com/photo.jpg",
          email: "test@example.com",
          phoneNumber: "+81-90-1234-5678",
          line: "test_line",
          discord: "test_discord",
          x: "test", // Note: @ prefix is removed by normalization
          otherContacts: "Slack: test_slack",
        });
        expect(result.data).toHaveProperty("updatedAt");
      });

      it("PrivateCardが存在しない場合、nullを返す", async () => {
        // Create user WITHOUT privateContacts
        await createTestUser(TEST_USER_ID, TEST_EMAIL, false);

        const functions = getFunctionsInstance();
        const getPrivateCard = httpsCallable(functions, "getPrivateCard");

        const result = await getPrivateCard({});

        expect(result.data).toBeNull();
      });
    });

    describe("失敗系", () => {
      it("未ログイン時に unauthenticated エラー", async () => {
        const functions = getFunctionsInstance();
        const getPrivateCard = httpsCallable(functions, "getPrivateCard");

        await expect(getPrivateCard({})).rejects.toThrow();
      });
    });
  });

  // Issue #50: Exchange Token Lifecycle Management Tests
  describe("createExchangeToken & savePrivateCard - Token Cleanup (Issue #50)", () => {
    const OWNER_USER_ID = "owner-user-123";
    const OWNER_EMAIL = "owner@example.com";
    const SAVER_USER_ID = "saver-user-456";
    const SAVER_EMAIL = "saver@example.com";

    describe("[即時削除] savePrivateCard で期限切れトークンを使用", () => {
      it("期限切れトークンを使用 → invalid-argument エラー + トークン削除", async () => {
        // Setup: Create owner with PrivateCard
        await createTestUser(OWNER_USER_ID, OWNER_EMAIL);
        const functions = getFunctionsInstance();

        const updateCard = httpsCallable(functions, "updateCard");
        await updateCard({email: "owner@example.com", phoneNumber: "+81-90-1111-2222"});

        const createExchangeToken = httpsCallable(functions, "createExchangeToken");
        const tokenResult = await createExchangeToken({});
        const tokenId = (tokenResult.data as {tokenId: string}).tokenId;

        // Wait for token to expire (>1 minute)
        await new Promise((resolve) => setTimeout(resolve, 61 * 1000));

        // Try to use expired token
        await createTestUser(SAVER_USER_ID, SAVER_EMAIL);
        const savePrivateCard = httpsCallable(functions, "savePrivateCard");
        await expect(savePrivateCard({tokenId})).rejects.toThrow("Token has expired");

        // Note: Token deletion is verified internally by the UseCase
        // Cannot verify via client SDK due to Firestore Security Rules
      }, 70000); // 70 seconds timeout

      it("削除済みトークンで savePrivateCard を再実行 → not-found エラー", async () => {
        // Setup: Create owner with PrivateCard
        await createTestUser(OWNER_USER_ID, OWNER_EMAIL);
        const functions = getFunctionsInstance();

        const updateCard = httpsCallable(functions, "updateCard");
        await updateCard({email: "owner@example.com"});

        const createExchangeToken = httpsCallable(functions, "createExchangeToken");
        const tokenResult = await createExchangeToken({});
        const tokenId = (tokenResult.data as {tokenId: string}).tokenId;

        // Wait for token to expire
        await new Promise((resolve) => setTimeout(resolve, 61 * 1000));

        // First attempt: expires and deletes token
        await createTestUser(SAVER_USER_ID, SAVER_EMAIL);
        const savePrivateCard = httpsCallable(functions, "savePrivateCard");
        await expect(savePrivateCard({tokenId})).rejects.toThrow("Token has expired");

        // Second attempt: should fail with "Token not found"
        await expect(savePrivateCard({tokenId})).rejects.toThrow("Token not found");
      }, 70000);
    });

    describe("[リフレッシュ] createExchangeToken でトークン自動削除", () => {
      it("新しいトークンを生成すると、古い未使用トークンが削除される", async () => {
        // Setup
        await createTestUser(OWNER_USER_ID, OWNER_EMAIL);
        const functions = getFunctionsInstance();

        const updateCard = httpsCallable(functions, "updateCard");
        await updateCard({email: "owner@example.com"});

        const createExchangeToken = httpsCallable(functions, "createExchangeToken");

        // Create first token
        const firstTokenResult = await createExchangeToken({});
        const firstTokenId = (firstTokenResult.data as {tokenId: string}).tokenId;

        // Create second token (should delete first token)
        const secondTokenResult = await createExchangeToken({});
        const secondTokenId = (secondTokenResult.data as {tokenId: string}).tokenId;

        // Verify first token is no longer usable (deleted)
        await createTestUser(SAVER_USER_ID, SAVER_EMAIL);
        const savePrivateCard = httpsCallable(functions, "savePrivateCard");
        await expect(savePrivateCard({tokenId: firstTokenId})).rejects.toThrow("Token not found");

        // Verify second token is still usable
        const result = await savePrivateCard({tokenId: secondTokenId});
        expect(result.data).toHaveProperty("success", true);
      });

      it("使用済みトークンは削除されない", async () => {
        // Setup: Create owner with PrivateCard
        await createTestUser(OWNER_USER_ID, OWNER_EMAIL);
        const functions = getFunctionsInstance();

        const updateCard = httpsCallable(functions, "updateCard");
        await updateCard({email: "owner@example.com"});

        const createExchangeToken = httpsCallable(functions, "createExchangeToken");

        // Create first token
        const firstTokenResult = await createExchangeToken({});
        const firstTokenId = (firstTokenResult.data as {tokenId: string}).tokenId;

        // Use the first token (by SAVER_USER_ID)
        await createTestUser(SAVER_USER_ID, SAVER_EMAIL);

        // SAVER needs PrivateCard before they can save others' cards
        const saverUpdatePrivateCard = httpsCallable(functions, "updateCard");
        await saverUpdatePrivateCard({email: "saver@example.com"});

        const savePrivateCard = httpsCallable(functions, "savePrivateCard");
        await savePrivateCard({tokenId: firstTokenId});

        // Switch back to OWNER and create second token
        await createTestUser(OWNER_USER_ID, OWNER_EMAIL);
        const secondTokenResult = await createExchangeToken({});
        const secondTokenId = (secondTokenResult.data as {tokenId: string}).tokenId;

        // Verify first token still cannot be reused (used tokens are not deleted but remain used)
        await createTestUser(SAVER_USER_ID, SAVER_EMAIL);
        await expect(savePrivateCard({tokenId: firstTokenId})).rejects.toThrow(
          "Token has already been used"
        );

        // Verify second token is different and usable
        expect(secondTokenId).not.toBe(firstTokenId);

        // Note: Cannot verify token existence via client SDK due to Security Rules
        // The fact that we get "already been used" instead of "not found" confirms
        // that the used token was not deleted
      });

      it("未使用トークンが0件でもエラーにならない", async () => {
        // Setup: First time token creation
        await createTestUser(OWNER_USER_ID, OWNER_EMAIL);
        const functions = getFunctionsInstance();

        const updateCard = httpsCallable(functions, "updateCard");
        await updateCard({email: "owner@example.com"});

        const createExchangeToken = httpsCallable(functions, "createExchangeToken");

        // Create first token (no previous tokens to delete)
        const result = await createExchangeToken({});
        expect(result.data).toHaveProperty("tokenId");
        expect(result.data).toHaveProperty("expiresAt");
        expect(result.data).toHaveProperty("qrCodeData");
      });
    });

    describe("[境界条件] 削除済みトークンの削除", () => {
      it("既に削除済みのトークンを削除してもエラーにならない", async () => {
        // This test verifies idempotency of delete operations
        // The deleteUnusedByOwnerId() method should handle empty results gracefully

        await createTestUser(OWNER_USER_ID, OWNER_EMAIL);
        const functions = getFunctionsInstance();

        const updateCard = httpsCallable(functions, "updateCard");
        await updateCard({email: "owner@example.com"});

        const createExchangeToken = httpsCallable(functions, "createExchangeToken");

        // Create first token
        const tokenResult = await createExchangeToken({});
        const tokenId = (tokenResult.data as {tokenId: string}).tokenId;

        // Create second token (deletes first token internally)
        const newTokenResult = await createExchangeToken({});
        expect(newTokenResult.data).toHaveProperty("tokenId");

        // Verify first token is deleted (not found)
        await createTestUser(SAVER_USER_ID, SAVER_EMAIL);
        const savePrivateCard = httpsCallable(functions, "savePrivateCard");
        await expect(savePrivateCard({tokenId})).rejects.toThrow("Token not found");
      });
    });
  });
});
