import {httpsCallable} from "firebase/functions";
import {setupTestEnvironment, teardownTestEnvironment, createTestUser} from "./setup";

describe("PublicCard Integration Tests", () => {
  let auth: any;
  let functions: any;

  beforeAll(async () => {
    const env = await setupTestEnvironment();
    auth = env.auth;
    functions = env.functions;
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  describe("getPublicCard", () => {
    it("should retrieve public card without authentication", async () => {
      // Create test user
      const email = `test-public-${Date.now()}@test.com`;
      const password = "password123";
      const user = await createTestUser(email, password);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Sign out to test unauthenticated access
      await auth.signOut();

      // Get public card
      const getPublicCard = httpsCallable(functions, "getPublicCard");
      const result = await getPublicCard({userId: user.uid});

      expect(result.data).toHaveProperty("publicCard");
      const publicCard = (result.data as any).publicCard;
      expect(publicCard.userId).toBe(user.uid);
      expect(publicCard.displayName).toBeDefined();
      expect(publicCard.connectedServices).toBeDefined();
      expect(publicCard.theme).toBe("default");
    });

    it("should retrieve public card with authentication", async () => {
      const email = `test-public-${Date.now()}@test.com`;
      const password = "password123";
      const user = await createTestUser(email, password);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const getPublicCard = httpsCallable(functions, "getPublicCard");
      const result = await getPublicCard({userId: user.uid});

      expect(result.data).toHaveProperty("publicCard");
      const publicCard = (result.data as any).publicCard;
      expect(publicCard.userId).toBe(user.uid);
    });

    it("should fail if userId is not provided", async () => {
      const getPublicCard = httpsCallable(functions, "getPublicCard");

      await expect(getPublicCard({})).rejects.toThrow();
    });

    it("should fail if public card does not exist", async () => {
      const getPublicCard = httpsCallable(functions, "getPublicCard");

      await expect(
        getPublicCard({userId: "nonexistent-user-id"})
      ).rejects.toThrow();
    });

    it("should retrieve updated public card after profile update", async () => {
      const email = `test-public-${Date.now()}@test.com`;
      const password = "password123";
      const user = await createTestUser(email, password);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update profile
      const updateProfile = httpsCallable(functions, "updateProfile");
      await updateProfile({
        displayName: "Updated Public Name",
        bio: "Updated bio text",
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get public card
      const getPublicCard = httpsCallable(functions, "getPublicCard");
      const result = await getPublicCard({userId: user.uid});

      const publicCard = (result.data as any).publicCard;
      expect(publicCard.displayName).toBe("Updated Public Name");
      expect(publicCard.bio).toBe("Updated bio text");
    });
  });
});
