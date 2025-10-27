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

  describe("updatePrivateCard", () => {
    describe("成功系", () => {
      it("有効な連絡先情報でPrivateCardが作成される", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updatePrivateCard = httpsCallable(functions, "updatePrivateCard");

        const result = await updatePrivateCard({
          email: "private@example.com",
          phoneNumber: "+81-90-1234-5678",
          lineId: "test_line_id",
        });

        expect(result.data).toEqual({success: true});

        // Verify Firestore data
        const firestore = getFirestoreInstance();
        const privateCardDoc = await getDoc(doc(firestore, "private_cards", TEST_USER_ID));
        const privateCardData = privateCardDoc.data();

        expect(privateCardData?.email).toBe("private@example.com");
        expect(privateCardData?.phoneNumber).toBe("+81-90-1234-5678");
        expect(privateCardData?.lineId).toBe("test_line_id");
        expect(privateCardData?.updatedAt).toBeDefined();
        expect(privateCardData?.displayName).toBe("Test User");
        expect(privateCardData?.photoURL).toBe("https://example.com/photo.jpg");
      });

      it("既存のPrivateCardが正しく更新され、updatedAtが更新される", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updatePrivateCard = httpsCallable(functions, "updatePrivateCard");

        // Initial update
        await updatePrivateCard({email: "initial@example.com"});

        // Wait to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Get initial updatedAt
        const firestore = getFirestoreInstance();
        const initialDoc = await getDoc(doc(firestore, "private_cards", TEST_USER_ID));
        const initialUpdatedAt = initialDoc.data()?.updatedAt;

        // Second update
        const result = await updatePrivateCard({email: "updated@example.com"});

        expect(result.data).toEqual({success: true});

        const updatedDoc = await getDoc(doc(firestore, "private_cards", TEST_USER_ID));
        const updatedData = updatedDoc.data();

        expect(updatedData?.email).toBe("updated@example.com");
        expect(updatedData?.updatedAt.toMillis()).toBeGreaterThan(initialUpdatedAt.toMillis());
      });

      it("部分更新が正しく動作し、updatedAtが更新される", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updatePrivateCard = httpsCallable(functions, "updatePrivateCard");

        // Create with multiple fields
        await updatePrivateCard({
          email: "test@example.com",
          phoneNumber: "+81-90-1234-5678",
          lineId: "test_line",
        });

        // Partial update - only email
        const result = await updatePrivateCard({email: "new@example.com"});

        expect(result.data).toEqual({success: true});

        const firestore = getFirestoreInstance();
        const updatedDoc = await getDoc(doc(firestore, "private_cards", TEST_USER_ID));
        const updatedData = updatedDoc.data();

        // Email should be updated
        expect(updatedData?.email).toBe("new@example.com");
        // Other fields should remain
        expect(updatedData?.phoneNumber).toBe("+81-90-1234-5678");
        expect(updatedData?.lineId).toBe("test_line");
      });

      it("twitterHandle に空文字列を送信すると undefined で保存される", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updatePrivateCard = httpsCallable(functions, "updatePrivateCard");

        // First, create with twitterHandle
        await updatePrivateCard({twitterHandle: "testuser"});

        const firestore = getFirestoreInstance();
        let privateCardDoc = await getDoc(doc(firestore, "private_cards", TEST_USER_ID));
        let privateCardData = privateCardDoc.data();
        expect(privateCardData?.twitterHandle).toBe("testuser");

        // Then, send empty string to delete the field
        const result = await updatePrivateCard({twitterHandle: ""});
        expect(result.data).toEqual({success: true});

        // Verify twitterHandle is now undefined (not stored in Firestore)
        privateCardDoc = await getDoc(doc(firestore, "private_cards", TEST_USER_ID));
        privateCardData = privateCardDoc.data();
        expect(privateCardData?.twitterHandle).toBeUndefined();
      });

      it("twitterHandle に 'testuser' を送信すると正規化されて保存される", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updatePrivateCard = httpsCallable(functions, "updatePrivateCard");

        const result = await updatePrivateCard({twitterHandle: "testuser"});
        expect(result.data).toEqual({success: true});

        const firestore = getFirestoreInstance();
        const privateCardDoc = await getDoc(doc(firestore, "private_cards", TEST_USER_ID));
        const privateCardData = privateCardDoc.data();
        expect(privateCardData?.twitterHandle).toBe("testuser");
      });

      it("twitterHandle に '@testuser' を送信すると '@' が除去されて保存される", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updatePrivateCard = httpsCallable(functions, "updatePrivateCard");

        const result = await updatePrivateCard({twitterHandle: "@testuser"});
        expect(result.data).toEqual({success: true});

        const firestore = getFirestoreInstance();
        const privateCardDoc = await getDoc(doc(firestore, "private_cards", TEST_USER_ID));
        const privateCardData = privateCardDoc.data();
        expect(privateCardData?.twitterHandle).toBe("testuser");
      });
    });

    describe("失敗系", () => {
      it("未ログイン時に unauthenticated エラー", async () => {
        // Don't create test user - not authenticated
        const functions = getFunctionsInstance();
        const updatePrivateCard = httpsCallable(functions, "updatePrivateCard");

        await expect(updatePrivateCard({email: "test@example.com"})).rejects.toThrow();
      });

      it("全フィールド未指定で invalid-argument エラー", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updatePrivateCard = httpsCallable(functions, "updatePrivateCard");

        await expect(updatePrivateCard({})).rejects.toThrow();
      });

      it("emailが無効な形式で invalid-argument エラー", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updatePrivateCard = httpsCallable(functions, "updatePrivateCard");

        await expect(updatePrivateCard({email: "invalid-email"})).rejects.toThrow();
      });

      it("文字列が最大長を超えて invalid-argument エラー", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updatePrivateCard = httpsCallable(functions, "updatePrivateCard");

        // phoneNumber max: 50
        await expect(updatePrivateCard({phoneNumber: "a".repeat(51)})).rejects.toThrow();

        // lineId max: 100
        await expect(updatePrivateCard({lineId: "a".repeat(101)})).rejects.toThrow();

        // otherContacts max: 1000
        await expect(updatePrivateCard({otherContacts: "a".repeat(1001)})).rejects.toThrow();
      });
    });
  });

  describe("getPrivateCard", () => {
    describe("成功系", () => {
      it("自分のPrivateCardが正しく取得できる", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

        const functions = getFunctionsInstance();
        const updatePrivateCard = httpsCallable(functions, "updatePrivateCard");
        const getPrivateCard = httpsCallable(functions, "getPrivateCard");

        // Create private card
        await updatePrivateCard({
          email: "test@example.com",
          phoneNumber: "+81-90-1234-5678",
          lineId: "test_line",
          discordId: "test_discord",
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
          lineId: "test_line",
          discordId: "test_discord",
          twitterHandle: "test", // Note: @ prefix is removed by normalization
          otherContacts: "Slack: test_slack",
        });
        expect(result.data).toHaveProperty("updatedAt");
      });

      it("PrivateCardが存在しない場合、nullを返す", async () => {
        await createTestUser(TEST_USER_ID, TEST_EMAIL);

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
});
