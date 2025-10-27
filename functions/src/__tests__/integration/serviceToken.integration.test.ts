/**
 * Integration tests for saveGitHubToken
 * Based on API Contract v0.7.0: contracts/API_CONTRACT.md lines 64-92
 */

import {
  setupTestEnvironment,
  cleanupTestData,
  teardownTestEnvironment,
  createTestUser,
  getFunctionsInstance,
  getFirestoreInstance,
} from "./setup";
import {httpsCallable} from "firebase/functions";
import {doc, getDoc} from "firebase/firestore";

describe("saveGitHubToken Integration Tests", () => {
  let functions: ReturnType<typeof getFunctionsInstance>;
  let firestore: ReturnType<typeof getFirestoreInstance>;

  const TEST_USER_ID = "test-user-github";
  const TEST_EMAIL = "github@example.com";

  beforeAll(async () => {
    await setupTestEnvironment();
    functions = getFunctionsInstance();
    firestore = getFirestoreInstance();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  describe("Contract: saveGitHubToken saves accessToken", () => {
    it("認証済みユーザーが GitHub OAuth トークンを保存できる", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const saveGitHubToken = httpsCallable(functions, "saveGitHubToken");
      const accessToken = "gho_test1234567890abcdefghijklmnopqrst";

      // Contract: returns {success: true}
      const result = await saveGitHubToken({accessToken});
      expect(result.data).toEqual({success: true});

      // Contract: saves to /users/{userId}.githubAccessToken
      const userDoc = await getDoc(doc(firestore, "users", TEST_USER_ID));
      expect(userDoc.exists()).toBe(true);
      expect(userDoc.data()?.githubAccessToken).toBe(accessToken);
    });

    it("既存のトークンを新しいトークンで上書きできる", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const saveGitHubToken = httpsCallable(functions, "saveGitHubToken");
      const oldToken = "gho_oldtoken1234567890";
      const newToken = "gho_newtoken0987654321";

      await saveGitHubToken({accessToken: oldToken});
      await saveGitHubToken({accessToken: newToken});

      const userDoc = await getDoc(doc(firestore, "users", TEST_USER_ID));
      expect(userDoc.data()?.githubAccessToken).toBe(newToken);
    });
  });

  describe("Contract: error - unauthenticated", () => {
    it("認証なしで呼び出すと unauthenticated エラー", async () => {
      // Don't create test user - no authentication
      const saveGitHubToken = httpsCallable(functions, "saveGitHubToken");

      await expect(
        saveGitHubToken({accessToken: "gho_test123"})
      ).rejects.toThrow();
    });
  });

  describe("Contract: error - invalid-argument", () => {
    it("accessToken が未指定の場合 invalid-argument エラー", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const saveGitHubToken = httpsCallable(functions, "saveGitHubToken");

      await expect(saveGitHubToken({})).rejects.toThrow();
    });

    it("accessToken が空文字列の場合 invalid-argument エラー", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const saveGitHubToken = httpsCallable(functions, "saveGitHubToken");

      await expect(saveGitHubToken({accessToken: ""})).rejects.toThrow();
    });

    it("accessToken が文字列でない場合 invalid-argument エラー", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const saveGitHubToken = httpsCallable(functions, "saveGitHubToken");

      await expect(saveGitHubToken({accessToken: 12345})).rejects.toThrow();
      await expect(saveGitHubToken({accessToken: null})).rejects.toThrow();
      await expect(saveGitHubToken({accessToken: undefined})).rejects.toThrow();
      await expect(saveGitHubToken({accessToken: {}})).rejects.toThrow();
      await expect(saveGitHubToken({accessToken: []})).rejects.toThrow();
    });
  });

  describe("Contract: edge cases", () => {
    it("非常に長いトークン文字列も保存できる", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const saveGitHubToken = httpsCallable(functions, "saveGitHubToken");
      const longToken = "gho_" + "a".repeat(500);

      const result = await saveGitHubToken({accessToken: longToken});
      expect(result.data).toEqual({success: true});

      const userDoc = await getDoc(doc(firestore, "users", TEST_USER_ID));
      expect(userDoc.data()?.githubAccessToken).toBe(longToken);
    });

    it("特殊文字を含むトークンも保存できる", async () => {
      await createTestUser(TEST_USER_ID, TEST_EMAIL);

      const saveGitHubToken = httpsCallable(functions, "saveGitHubToken");
      const specialToken = "gho_ABC123-_./+";

      const result = await saveGitHubToken({accessToken: specialToken});
      expect(result.data).toEqual({success: true});

      const userDoc = await getDoc(doc(firestore, "users", TEST_USER_ID));
      expect(userDoc.data()?.githubAccessToken).toBe(specialToken);
    });
  });
});
