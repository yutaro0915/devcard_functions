/**
 * Integration tests for updateCard API
 * Testing REQUIREMENTS, not implementation
 */
import {getFirestore} from "firebase-admin/firestore";
import {getFunctions} from "firebase-admin/functions";
import {getAuth} from "firebase-admin/auth";
import {createTestUser, cleanupTestUser} from "./setup";

const firestore = getFirestore();

describe("updateCard API - Requirements", () => {
  let testUserId: string;
  let testUserIdToken: string;

  beforeAll(async () => {
    const testUser = await createTestUser();
    testUserId = testUser.uid;
    testUserIdToken = testUser.idToken;
  });

  afterAll(async () => {
    await cleanupTestUser(testUserId);
  });

  describe("Requirement: Single unified API for all card updates", () => {
    it("should update profile fields (displayName, bio, photoURL)", async () => {
      const {httpsCallable} = await import("firebase/functions");
      const functions = getFunctions();
      const updateCard = httpsCallable(functions, "updateCard");

      const result = await updateCard({
        displayName: "Test User Updated",
        bio: "Updated bio",
        photoURL: "https://example.com/photo.jpg",
      });

      expect(result.data).toEqual({success: true});

      // Verify /cards was updated
      const cardDoc = await firestore.collection("cards").doc(testUserId).get();
      const cardData = cardDoc.data();
      expect(cardData?.displayName).toBe("Test User Updated");
      expect(cardData?.bio).toBe("Updated bio");
      expect(cardData?.photoURL).toBe("https://example.com/photo.jpg");

      // Verify /users was updated (for Auth compatibility)
      const userDoc = await firestore.collection("users").doc(testUserId).get();
      const userData = userDoc.data();
      expect(userData?.displayName).toBe("Test User Updated");
      expect(userData?.photoURL).toBe("https://example.com/photo.jpg");
    });

    it("should update contact fields (email, phoneNumber)", async () => {
      const {httpsCallable} = await import("firebase/functions");
      const functions = getFunctions();
      const updateCard = httpsCallable(functions, "updateCard");

      const result = await updateCard({
        email: "test@example.com",
        phoneNumber: "+81-90-1234-5678",
      });

      expect(result.data).toEqual({success: true});

      const cardDoc = await firestore.collection("cards").doc(testUserId).get();
      const cardData = cardDoc.data();
      expect(cardData?.email).toBe("test@example.com");
      expect(cardData?.phoneNumber).toBe("+81-90-1234-5678");
    });

    it("should update messaging fields (line, discord, telegram, slack)", async () => {
      const {httpsCallable} = await import("firebase/functions");
      const functions = getFunctions();
      const updateCard = httpsCallable(functions, "updateCard");

      const result = await updateCard({
        line: "line_id",
        discord: "discord#1234",
        telegram: "@telegram_user",
        slack: "slack_user",
      });

      expect(result.data).toEqual({success: true});

      const cardDoc = await firestore.collection("cards").doc(testUserId).get();
      const cardData = cardDoc.data();
      expect(cardData?.line).toBe("line_id");
      expect(cardData?.discord).toBe("discord#1234");
      expect(cardData?.telegram).toBe("@telegram_user");
      expect(cardData?.slack).toBe("slack_user");
    });

    it("should update SNS fields (github, x, linkedin, etc)", async () => {
      const {httpsCallable} = await import("firebase/functions");
      const functions = getFunctions();
      const updateCard = httpsCallable(functions, "updateCard");

      const result = await updateCard({
        github: "octocat",
        x: "twitter_user",
        linkedin: "linkedin-user",
        instagram: "insta_user",
        facebook: "fb_user",
        zenn: "zenn_user",
        qiita: "qiita_user",
        website: "https://example.com",
        blog: "https://blog.example.com",
        youtube: "youtube_channel",
        twitch: "twitch_channel",
      });

      expect(result.data).toEqual({success: true});

      const cardDoc = await firestore.collection("cards").doc(testUserId).get();
      const cardData = cardDoc.data();
      expect(cardData?.github).toBe("octocat");
      expect(cardData?.x).toBe("twitter_user");
      expect(cardData?.linkedin).toBe("linkedin-user");
      expect(cardData?.instagram).toBe("insta_user");
      expect(cardData?.facebook).toBe("fb_user");
      expect(cardData?.zenn).toBe("zenn_user");
      expect(cardData?.qiita).toBe("qiita_user");
      expect(cardData?.website).toBe("https://example.com");
      expect(cardData?.blog).toBe("https://blog.example.com");
      expect(cardData?.youtube).toBe("youtube_channel");
      expect(cardData?.twitch).toBe("twitch_channel");
    });

    it("should update all fields at once (full update)", async () => {
      const {httpsCallable} = await import("firebase/functions");
      const functions = getFunctions();
      const updateCard = httpsCallable(functions, "updateCard");

      const result = await updateCard({
        displayName: "Full Update",
        bio: "Complete profile",
        photoURL: "https://example.com/photo.jpg",
        email: "full@example.com",
        phoneNumber: "+81-90-1234-5678",
        line: "line_id",
        discord: "discord#1234",
        github: "octocat",
        x: "twitter_user",
        linkedin: "linkedin-user",
        website: "https://example.com",
      });

      expect(result.data).toEqual({success: true});

      const cardDoc = await firestore.collection("cards").doc(testUserId).get();
      const cardData = cardDoc.data();
      expect(cardData?.displayName).toBe("Full Update");
      expect(cardData?.bio).toBe("Complete profile");
      expect(cardData?.email).toBe("full@example.com");
      expect(cardData?.github).toBe("octocat");
      expect(cardData?.website).toBe("https://example.com");
    });
  });

  describe("Requirement: Validation", () => {
    it("should reject invalid email format", async () => {
      const {httpsCallable} = await import("firebase/functions");
      const functions = getFunctions();
      const updateCard = httpsCallable(functions, "updateCard");

      await expect(updateCard({email: "invalid-email"})).rejects.toThrow();
    });

    it("should reject displayName too short", async () => {
      const {httpsCallable} = await import("firebase/functions");
      const functions = getFunctions();
      const updateCard = httpsCallable(functions, "updateCard");

      await expect(updateCard({displayName: ""})).rejects.toThrow();
    });

    it("should reject displayName too long", async () => {
      const {httpsCallable} = await import("firebase/functions");
      const functions = getFunctions();
      const updateCard = httpsCallable(functions, "updateCard");

      await expect(updateCard({displayName: "a".repeat(101)})).rejects.toThrow();
    });

    it("should reject bio too long", async () => {
      const {httpsCallable} = await import("firebase/functions");
      const functions = getFunctions();
      const updateCard = httpsCallable(functions, "updateCard");

      await expect(updateCard({bio: "a".repeat(501)})).rejects.toThrow();
    });

    it("should reject photoURL with non-HTTPS protocol", async () => {
      const {httpsCallable} = await import("firebase/functions");
      const functions = getFunctions();
      const updateCard = httpsCallable(functions, "updateCard");

      await expect(updateCard({photoURL: "http://example.com/photo.jpg"})).rejects.toThrow();
    });

    it("should reject when no fields provided", async () => {
      const {httpsCallable} = await import("firebase/functions");
      const functions = getFunctions();
      const updateCard = httpsCallable(functions, "updateCard");

      await expect(updateCard({})).rejects.toThrow();
    });
  });

  describe("Requirement: Authentication", () => {
    it("should reject unauthenticated requests", async () => {
      const {httpsCallable} = await import("firebase/functions");
      const functions = getFunctions();
      const updateCard = httpsCallable(functions, "updateCard");

      // Call without authentication
      await expect(
        updateCard({displayName: "Hacker"})
      ).rejects.toMatchObject({
        code: "functions/unauthenticated",
      });
    });
  });

  describe("Requirement: Partial updates", () => {
    it("should only update specified fields, preserve others", async () => {
      const {httpsCallable} = await import("firebase/functions");
      const functions = getFunctions();
      const updateCard = httpsCallable(functions, "updateCard");

      // First update: set initial values
      await updateCard({
        displayName: "Initial Name",
        bio: "Initial bio",
        email: "initial@example.com",
      });

      // Second update: only update displayName
      await updateCard({
        displayName: "Updated Name",
      });

      // Verify: displayName changed, bio and email preserved
      const cardDoc = await firestore.collection("cards").doc(testUserId).get();
      const cardData = cardDoc.data();
      expect(cardData?.displayName).toBe("Updated Name");
      expect(cardData?.bio).toBe("Initial bio");
      expect(cardData?.email).toBe("initial@example.com");
    });
  });
});
