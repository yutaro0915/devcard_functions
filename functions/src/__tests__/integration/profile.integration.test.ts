import {httpsCallable} from "firebase/functions";
import {doc, getDoc} from "firebase/firestore";
import {setupTestEnvironment, teardownTestEnvironment, createTestUser} from "./setup";

describe("Profile Integration Tests", () => {
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

  describe("updateProfile", () => {
    it("should update user profile successfully", async () => {
      // Create test user
      const email = `test-profile-${Date.now()}@test.com`;
      const password = "password123";
      const user = await createTestUser(email, password);

      // Wait for onUserCreate trigger to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Call updateProfile function
      const updateProfile = httpsCallable(functions, "updateProfile");
      const result = await updateProfile({
        displayName: "Updated Name",
        bio: "Updated bio",
        photoURL: "https://example.com/photo.jpg",
      });

      expect(result.data).toEqual({success: true});

      // Verify /users document updated
      const userDoc = await getDoc(doc(db, "users", user.uid));
      expect(userDoc.exists()).toBe(true);
      expect(userDoc.data()?.displayName).toBe("Updated Name");
      expect(userDoc.data()?.photoURL).toBe("https://example.com/photo.jpg");

      // Verify /public_cards document updated
      const publicCardDoc = await getDoc(doc(db, "public_cards", user.uid));
      expect(publicCardDoc.exists()).toBe(true);
      expect(publicCardDoc.data()?.displayName).toBe("Updated Name");
      expect(publicCardDoc.data()?.bio).toBe("Updated bio");
      expect(publicCardDoc.data()?.photoURL).toBe("https://example.com/photo.jpg");
    });

    it("should update only displayName", async () => {
      const email = `test-profile-${Date.now()}@test.com`;
      const password = "password123";
      const user = await createTestUser(email, password);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const updateProfile = httpsCallable(functions, "updateProfile");
      const result = await updateProfile({
        displayName: "New Display Name",
      });

      expect(result.data).toEqual({success: true});

      const userDoc = await getDoc(doc(db, "users", user.uid));
      expect(userDoc.data()?.displayName).toBe("New Display Name");

      const publicCardDoc = await getDoc(doc(db, "public_cards", user.uid));
      expect(publicCardDoc.data()?.displayName).toBe("New Display Name");
    });

    it("should fail if user is not authenticated", async () => {
      await auth.signOut();

      const updateProfile = httpsCallable(functions, "updateProfile");

      await expect(
        updateProfile({displayName: "Test"})
      ).rejects.toThrow();
    });

    it("should fail if no fields provided", async () => {
      const email = `test-profile-${Date.now()}@test.com`;
      const password = "password123";
      await createTestUser(email, password);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const updateProfile = httpsCallable(functions, "updateProfile");

      await expect(updateProfile({})).rejects.toThrow();
    });
  });
});
