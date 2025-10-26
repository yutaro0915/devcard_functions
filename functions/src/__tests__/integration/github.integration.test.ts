import {httpsCallable} from "firebase/functions";
import {doc, getDoc} from "firebase/firestore";
import {setupTestEnvironment, teardownTestEnvironment, createTestUser} from "./setup";

describe("GitHub Integration Tests", () => {
  let auth: any;
  let functions: any;
  let db: any;

  beforeAll(async () => {
    const env = await setupTestEnvironment();
    auth = env.auth;
    functions = env.functions;
    db = env.db;
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  describe("saveGitHubToken", () => {
    it("should save GitHub token successfully", async () => {
      const email = `test-github-${Date.now()}@test.com`;
      const password = "password123";
      const user = await createTestUser(email, password);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const saveGitHubToken = httpsCallable(functions, "saveGitHubToken");
      const result = await saveGitHubToken({
        accessToken: "test_github_token_12345",
      });

      expect(result.data).toEqual({success: true});

      // Verify token saved in /users
      const userDoc = await getDoc(doc(db, "users", user.uid));
      expect(userDoc.exists()).toBe(true);
      expect(userDoc.data()?.githubAccessToken).toBe("test_github_token_12345");
    });

    it("should fail if not authenticated", async () => {
      await auth.signOut();

      const saveGitHubToken = httpsCallable(functions, "saveGitHubToken");

      await expect(
        saveGitHubToken({accessToken: "test_token"})
      ).rejects.toThrow();
    });

    it("should fail if accessToken is not provided", async () => {
      const email = `test-github-${Date.now()}@test.com`;
      const password = "password123";
      await createTestUser(email, password);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const saveGitHubToken = httpsCallable(functions, "saveGitHubToken");

      await expect(saveGitHubToken({})).rejects.toThrow();
    });
  });

  describe("manualSync", () => {
    it("should fail without GitHub token", async () => {
      const email = `test-sync-${Date.now()}@test.com`;
      const password = "password123";
      await createTestUser(email, password);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const manualSync = httpsCallable(functions, "manualSync");

      // Should fail because no GitHub token is saved
      await expect(manualSync({})).rejects.toThrow();
    });

    it("should fail with invalid GitHub token", async () => {
      const email = `test-sync-${Date.now()}@test.com`;
      const password = "password123";
      await createTestUser(email, password);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Save invalid token
      const saveGitHubToken = httpsCallable(functions, "saveGitHubToken");
      await saveGitHubToken({accessToken: "invalid_token"});

      const manualSync = httpsCallable(functions, "manualSync");

      // Should fail because GitHub API will reject invalid token
      await expect(manualSync({})).rejects.toThrow();
    });

    // Note: Testing successful sync requires a valid GitHub token
    // which we cannot include in tests. This should be tested manually
    // or with a mocked GitHub service in the future.
  });
});
