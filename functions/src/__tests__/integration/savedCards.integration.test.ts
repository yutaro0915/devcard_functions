import {httpsCallable} from "firebase/functions";
import {setupTestEnvironment, teardownTestEnvironment, createTestUser} from "./setup";

describe("SavedCards Integration Tests", () => {
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

  describe("saveCard and getSavedCards", () => {
    it("should save a card and retrieve it", async () => {
      // Create test user
      const email = `test-saved-${Date.now()}@test.com`;
      const password = "password123";
      await createTestUser(email, password);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create another user to save their card
      const targetEmail = `target-${Date.now()}@test.com`;
      const targetUser = await createTestUser(targetEmail, password);
      const targetUserId = targetUser.uid;

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Save the target user's card
      const saveCard = httpsCallable(functions, "saveCard");
      const saveResult = await saveCard({
        cardUserId: targetUserId,
        memo: "Test note",
        tags: ["colleague", "engineer"],
      });

      expect(saveResult.data).toHaveProperty("success", true);
      expect(saveResult.data).toHaveProperty("savedCard");

      // Retrieve saved cards
      const getSavedCards = httpsCallable(functions, "getSavedCards");
      const getResult = await getSavedCards({});

      expect(getResult.data).toHaveProperty("savedCards");
      const savedCards = (getResult.data as any).savedCards;
      expect(Array.isArray(savedCards)).toBe(true);
      expect(savedCards.length).toBe(1);

      const item = savedCards[0];
      expect(item.savedCard.cardUserId).toBe(targetUserId);
      expect(item.savedCard.memo).toBe("Test note");
      expect(item.savedCard.tags).toEqual(["colleague", "engineer"]);
      expect(item.publicCard).toBeDefined();
      expect(item.publicCard.userId).toBe(targetUserId);
    });

    it("should save card without optional fields", async () => {
      const email = `test-saved-${Date.now()}@test.com`;
      const password = "password123";
      await createTestUser(email, password);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const targetEmail = `target-${Date.now()}@test.com`;
      const targetUser = await createTestUser(targetEmail, password);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const saveCard = httpsCallable(functions, "saveCard");
      const result = await saveCard({
        cardUserId: targetUser.uid,
      });

      expect(result.data).toHaveProperty("success", true);
      expect(result.data).toHaveProperty("savedCard");

      const getSavedCards = httpsCallable(functions, "getSavedCards");
      const getResult = await getSavedCards({});
      const savedCards = (getResult.data as any).savedCards;

      expect(savedCards.length).toBeGreaterThan(0);
      const item = savedCards.find((c: any) => c.savedCard.cardUserId === targetUser.uid);
      expect(item).toBeDefined();
      expect(item.savedCard.memo).toBeNull();
      expect(item.savedCard.tags).toBeNull();
    });

    it("should fail to save card if not authenticated", async () => {
      await auth.signOut();

      const saveCard = httpsCallable(functions, "saveCard");

      await expect(
        saveCard({cardUserId: "some-user-id"})
      ).rejects.toThrow();
    });

    it("should return empty array if no saved cards", async () => {
      const email = `test-saved-${Date.now()}@test.com`;
      const password = "password123";
      await createTestUser(email, password);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const getSavedCards = httpsCallable(functions, "getSavedCards");
      const result = await getSavedCards({});

      expect(result.data).toHaveProperty("savedCards");
      expect((result.data as any).savedCards).toEqual([]);
    });
  });
});
