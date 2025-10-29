import {
  setupTestEnvironment,
  teardownTestEnvironment,
  cleanupTestData,
  createTestUser,
  getFunctionsInstance,
} from "./setup";
import {httpsCallable} from "firebase/functions";
import * as admin from "firebase-admin";

describe("Badge Management Integration Test", () => {
  let adminApp: admin.app.App;

  beforeAll(async () => {
    await setupTestEnvironment();
    // Get admin app for setting Custom Claims
    adminApp = admin.apps[0] as admin.app.App;
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  const ADMIN_USER_ID = "admin-user-123";
  const ADMIN_EMAIL = "admin@example.com";
  const MODERATOR_USER_ID = "moderator-user-456";
  const MODERATOR_EMAIL = "moderator@example.com";
  const REGULAR_USER_ID = "regular-user-789";
  const REGULAR_EMAIL = "regular@example.com";

  /**
   * Helper function to set custom claims and re-authenticate
   */
  async function setCustomClaimsAndReauth(
    userId: string,
    claims: {moderator?: boolean; admin?: boolean}
  ): Promise<void> {
    await adminApp.auth().setCustomUserClaims(userId, claims);
    // Re-authenticate to get new token with claims
    const customToken = await adminApp.auth().createCustomToken(userId, claims);
    const {getAuth, signInWithCustomToken} = await import("firebase/auth");
    const auth = getAuth();
    await signInWithCustomToken(auth, customToken);
  }

  describe("addModerator", () => {
    it("admin が addModerator でモデレータを追加できる", async () => {
      await createTestUser(ADMIN_USER_ID, ADMIN_EMAIL);
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);

      // Set admin claims
      await setCustomClaimsAndReauth(ADMIN_USER_ID, {moderator: true, admin: true});

      const functions = getFunctionsInstance();
      const addModerator = httpsCallable(functions, "addModerator");

      const result = await addModerator({
        userId: MODERATOR_USER_ID,
        role: "moderator",
        permissions: ["badge:create", "badge:grant"],
      });

      expect(result.data).toHaveProperty("success", true);
      expect(result.data).toHaveProperty("moderator");

      const moderatorData = (result.data as any).moderator;
      expect(moderatorData.userId).toBe(MODERATOR_USER_ID);
      expect(moderatorData.role).toBe("moderator");
      expect(moderatorData.permissions).toEqual(["badge:create", "badge:grant"]);

      // Verify Firestore
      const adminFirestore = adminApp.firestore();
      const modDoc = await adminFirestore.collection("moderators").doc(MODERATOR_USER_ID).get();
      expect(modDoc.exists).toBe(true);
      expect(modDoc.data()?.role).toBe("moderator");

      // Verify Custom Claims
      const userRecord = await adminApp.auth().getUser(MODERATOR_USER_ID);
      expect(userRecord.customClaims?.moderator).toBe(true);
      expect(userRecord.customClaims?.admin).toBe(false);
    });

    it("一般ユーザーは addModerator を実行できない（permission-denied）", async () => {
      await createTestUser(REGULAR_USER_ID, REGULAR_EMAIL);
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);

      const functions = getFunctionsInstance();
      const addModerator = httpsCallable(functions, "addModerator");

      await expect(
        addModerator({
          userId: MODERATOR_USER_ID,
          role: "moderator",
          permissions: ["badge:create"],
        })
      ).rejects.toThrow();
    });
  });

  describe("createBadge", () => {
    it("モデレータが有効なバッジを作成できる", async () => {
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);
      await setCustomClaimsAndReauth(MODERATOR_USER_ID, {moderator: true});

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");

      const result = await createBadge({
        name: "First 100 Users",
        description: "Awarded to the first 100 users who signed up",
        iconUrl: "https://example.com/badge.png",
        color: "#FFD700",
        priority: 1,
        isActive: true,
      });

      expect(result.data).toHaveProperty("success", true);
      expect(result.data).toHaveProperty("badge");

      const badgeData = (result.data as any).badge;
      expect(badgeData.badgeId).toBeDefined();
      expect(badgeData.name).toBe("First 100 Users");
      expect(badgeData.priority).toBe(1);

      // Verify Firestore
      const adminFirestore = adminApp.firestore();
      const badgeDoc = await adminFirestore.collection("badges").doc(badgeData.badgeId).get();
      expect(badgeDoc.exists).toBe(true);
      expect(badgeDoc.data()?.name).toBe("First 100 Users");
    });

    it("一般ユーザーはバッジを作成できない（permission-denied）", async () => {
      await createTestUser(REGULAR_USER_ID, REGULAR_EMAIL);

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");

      await expect(
        createBadge({
          name: "Test Badge",
          description: "Test",
          priority: 1,
          isActive: true,
        })
      ).rejects.toThrow();
    });

    it("未認証ユーザーはバッジを作成できない（unauthenticated）", async () => {
      // Sign out
      const {getAuth} = await import("firebase/auth");
      const auth = getAuth();
      await auth.signOut();

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");

      await expect(
        createBadge({
          name: "Test Badge",
          description: "Test",
          priority: 1,
          isActive: true,
        })
      ).rejects.toThrow();
    });

    it("バッジの優先度を指定できる", async () => {
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);
      await setCustomClaimsAndReauth(MODERATOR_USER_ID, {moderator: true});

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");

      const result = await createBadge({
        name: "High Priority Badge",
        description: "High priority",
        priority: 0,
        isActive: true,
      });

      const badgeData = (result.data as any).badge;
      expect(badgeData.priority).toBe(0);
    });

    it("バッジ名が空の場合エラー（invalid-argument）", async () => {
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);
      await setCustomClaimsAndReauth(MODERATOR_USER_ID, {moderator: true});

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");

      await expect(
        createBadge({
          name: "",
          description: "Test",
          priority: 1,
          isActive: true,
        })
      ).rejects.toThrow();
    });

    it("バッジ名が50文字を超える場合エラー（invalid-argument）", async () => {
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);
      await setCustomClaimsAndReauth(MODERATOR_USER_ID, {moderator: true});

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");

      await expect(
        createBadge({
          name: "a".repeat(51),
          description: "Test",
          priority: 1,
          isActive: true,
        })
      ).rejects.toThrow();
    });
  });

  describe("grantBadge", () => {
    it("モデレータが指定ユーザーにバッジを付与できる", async () => {
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);
      await createTestUser(REGULAR_USER_ID, REGULAR_EMAIL);
      await setCustomClaimsAndReauth(MODERATOR_USER_ID, {moderator: true});

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");
      const grantBadge = httpsCallable(functions, "grantBadge");

      // Create badge first
      const badgeResult = await createBadge({
        name: "Test Badge",
        description: "Test description",
        priority: 1,
        isActive: true,
      });
      const badgeId = (badgeResult.data as any).badge.badgeId;

      // Grant badge
      const result = await grantBadge({
        badgeId,
        targetUserId: REGULAR_USER_ID,
        reason: "Testing badge grant",
      });

      expect(result.data).toHaveProperty("success", true);
      expect(result.data).toHaveProperty("userBadge");

      const userBadgeData = (result.data as any).userBadge;
      expect(userBadgeData.badgeId).toBe(badgeId);
      expect(userBadgeData.grantedBy).toBe(MODERATOR_USER_ID);
      expect(userBadgeData.reason).toBe("Testing badge grant");

      // Verify Firestore
      const adminFirestore = adminApp.firestore();
      const userBadgeDoc = await adminFirestore
        .collection("users")
        .doc(REGULAR_USER_ID)
        .collection("badges")
        .doc(badgeId)
        .get();
      expect(userBadgeDoc.exists).toBe(true);
      expect(userBadgeDoc.data()?.badgeId).toBe(badgeId);
    });

    it("バッジ付与後、デフォルトで visibility: {showOnPublicCard: true, showOnPrivateCard: true} が設定される", async () => {
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);
      await createTestUser(REGULAR_USER_ID, REGULAR_EMAIL);
      await setCustomClaimsAndReauth(MODERATOR_USER_ID, {moderator: true});

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");
      const grantBadge = httpsCallable(functions, "grantBadge");

      const badgeResult = await createBadge({
        name: "Test Badge",
        description: "Test",
        priority: 1,
        isActive: true,
      });
      const badgeId = (badgeResult.data as any).badge.badgeId;

      const result = await grantBadge({
        badgeId,
        targetUserId: REGULAR_USER_ID,
      });

      const userBadgeData = (result.data as any).userBadge;
      expect(userBadgeData.visibility).toEqual({
        showOnPublicCard: true,
        showOnPrivateCard: true,
      });

      // Verify Firestore
      const adminFirestore = adminApp.firestore();
      const userBadgeDoc = await adminFirestore
        .collection("users")
        .doc(REGULAR_USER_ID)
        .collection("badges")
        .doc(badgeId)
        .get();
      expect(userBadgeDoc.data()?.visibility).toEqual({
        showOnPublicCard: true,
        showOnPrivateCard: true,
      });
    });

    it("バッジ付与時に理由を記録できる", async () => {
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);
      await createTestUser(REGULAR_USER_ID, REGULAR_EMAIL);
      await setCustomClaimsAndReauth(MODERATOR_USER_ID, {moderator: true});

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");
      const grantBadge = httpsCallable(functions, "grantBadge");

      const badgeResult = await createBadge({
        name: "Test Badge",
        description: "Test",
        priority: 1,
        isActive: true,
      });
      const badgeId = (badgeResult.data as any).badge.badgeId;

      const result = await grantBadge({
        badgeId,
        targetUserId: REGULAR_USER_ID,
        reason: "Participated in beta testing",
      });

      const userBadgeData = (result.data as any).userBadge;
      expect(userBadgeData.reason).toBe("Participated in beta testing");
    });

    it("存在しないバッジIDを付与しようとした場合エラー（not-found）", async () => {
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);
      await createTestUser(REGULAR_USER_ID, REGULAR_EMAIL);
      await setCustomClaimsAndReauth(MODERATOR_USER_ID, {moderator: true});

      const functions = getFunctionsInstance();
      const grantBadge = httpsCallable(functions, "grantBadge");

      await expect(
        grantBadge({
          badgeId: "non-existent-badge",
          targetUserId: REGULAR_USER_ID,
        })
      ).rejects.toThrow();
    });

    it("存在しないユーザーにバッジを付与しようとした場合エラー（not-found）", async () => {
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);
      await setCustomClaimsAndReauth(MODERATOR_USER_ID, {moderator: true});

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");
      const grantBadge = httpsCallable(functions, "grantBadge");

      const badgeResult = await createBadge({
        name: "Test Badge",
        description: "Test",
        priority: 1,
        isActive: true,
      });
      const badgeId = (badgeResult.data as any).badge.badgeId;

      await expect(
        grantBadge({
          badgeId,
          targetUserId: "non-existent-user",
        })
      ).rejects.toThrow();
    });

    it("既に付与されているバッジを再付与しようとした場合エラー（already-exists）", async () => {
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);
      await createTestUser(REGULAR_USER_ID, REGULAR_EMAIL);
      await setCustomClaimsAndReauth(MODERATOR_USER_ID, {moderator: true});

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");
      const grantBadge = httpsCallable(functions, "grantBadge");

      const badgeResult = await createBadge({
        name: "Test Badge",
        description: "Test",
        priority: 1,
        isActive: true,
      });
      const badgeId = (badgeResult.data as any).badge.badgeId;

      // First grant
      await grantBadge({
        badgeId,
        targetUserId: REGULAR_USER_ID,
      });

      // Second grant (should fail)
      await expect(
        grantBadge({
          badgeId,
          targetUserId: REGULAR_USER_ID,
        })
      ).rejects.toThrow();
    });
  });

  describe("revokeBadge", () => {
    it("モデレータがバッジを失効できる", async () => {
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);
      await createTestUser(REGULAR_USER_ID, REGULAR_EMAIL);
      await setCustomClaimsAndReauth(MODERATOR_USER_ID, {moderator: true});

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");
      const grantBadge = httpsCallable(functions, "grantBadge");
      const revokeBadge = httpsCallable(functions, "revokeBadge");

      const badgeResult = await createBadge({
        name: "Test Badge",
        description: "Test",
        priority: 1,
        isActive: true,
      });
      const badgeId = (badgeResult.data as any).badge.badgeId;

      // Grant badge
      await grantBadge({
        badgeId,
        targetUserId: REGULAR_USER_ID,
      });

      // Revoke badge
      const result = await revokeBadge({
        badgeId,
        targetUserId: REGULAR_USER_ID,
      });

      expect(result.data).toEqual({success: true});

      // Verify Firestore (badge should be deleted)
      const adminFirestore = adminApp.firestore();
      const userBadgeDoc = await adminFirestore
        .collection("users")
        .doc(REGULAR_USER_ID)
        .collection("badges")
        .doc(badgeId)
        .get();
      expect(userBadgeDoc.exists).toBe(false);
    });
  });

  describe("listBadges", () => {
    it("全ユーザーがバッジ一覧を取得できる", async () => {
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);
      await createTestUser(REGULAR_USER_ID, REGULAR_EMAIL);
      await setCustomClaimsAndReauth(MODERATOR_USER_ID, {moderator: true});

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");

      // Create badges
      await createBadge({
        name: "Badge 1",
        description: "First badge",
        priority: 1,
        isActive: true,
      });
      await createBadge({
        name: "Badge 2",
        description: "Second badge",
        priority: 2,
        isActive: true,
      });

      // Re-auth as regular user
      await setCustomClaimsAndReauth(REGULAR_USER_ID, {});

      const listBadges = httpsCallable(functions, "listBadges");
      const result = await listBadges({});

      expect(result.data).toHaveProperty("success", true);
      expect(result.data).toHaveProperty("badges");

      const badges = (result.data as any).badges;
      expect(badges.length).toBe(2);
      expect(badges[0].name).toBe("Badge 1");
      expect(badges[1].name).toBe("Badge 2");
    });

    it("非アクティブなバッジは一覧に表示されない", async () => {
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);
      await setCustomClaimsAndReauth(MODERATOR_USER_ID, {moderator: true});

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");
      const listBadges = httpsCallable(functions, "listBadges");

      // Create active badge
      await createBadge({
        name: "Active Badge",
        description: "Active",
        priority: 1,
        isActive: true,
      });

      // Create inactive badge
      await createBadge({
        name: "Inactive Badge",
        description: "Inactive",
        priority: 2,
        isActive: false,
      });

      const result = await listBadges({});
      const badges = (result.data as any).badges;

      expect(badges.length).toBe(1);
      expect(badges[0].name).toBe("Active Badge");
    });
  });

  describe("updateBadgeVisibility (Phase 2)", () => {
    it("ユーザーが自分のバッジ表示設定を更新できる", async () => {
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);
      await createTestUser(REGULAR_USER_ID, REGULAR_EMAIL);
      await setCustomClaimsAndReauth(MODERATOR_USER_ID, {moderator: true});

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");
      const grantBadge = httpsCallable(functions, "grantBadge");

      // Create and grant badge
      const badgeResult = await createBadge({
        name: "Test Badge",
        description: "Test",
        priority: 1,
        isActive: true,
      });
      const badgeId = (badgeResult.data as any).badge.badgeId;

      await grantBadge({
        badgeId,
        targetUserId: REGULAR_USER_ID,
      });

      // Re-auth as regular user
      await setCustomClaimsAndReauth(REGULAR_USER_ID, {});

      // Update visibility
      const updateBadgeVisibility = httpsCallable(functions, "updateBadgeVisibility");
      const result = await updateBadgeVisibility({
        badgeId,
        showOnPublicCard: false,
        showOnPrivateCard: true,
      });

      expect(result.data).toEqual({success: true});

      // Verify using getUserBadges
      const getUserBadges = httpsCallable(functions, "getUserBadges");
      const badgesResult = await getUserBadges({userId: REGULAR_USER_ID});
      const badges = (badgesResult.data as any).badges;

      expect(badges.length).toBe(1);
      expect(badges[0].visibility).toEqual({
        showOnPublicCard: false,
        showOnPrivateCard: true,
      });
    });

    it("未認証ユーザーはバッジ表示設定を変更できない", async () => {
      const {getAuth} = await import("firebase/auth");
      const auth = getAuth();
      await auth.signOut();

      const functions = getFunctionsInstance();
      const updateBadgeVisibility = httpsCallable(functions, "updateBadgeVisibility");

      await expect(
        updateBadgeVisibility({
          badgeId: "some-badge",
          showOnPublicCard: true,
          showOnPrivateCard: true,
        })
      ).rejects.toThrow();
    });

    it("所持していないバッジの表示設定を変更しようとした場合エラー", async () => {
      await createTestUser(REGULAR_USER_ID, REGULAR_EMAIL);
      await setCustomClaimsAndReauth(REGULAR_USER_ID, {});

      const functions = getFunctionsInstance();
      const updateBadgeVisibility = httpsCallable(functions, "updateBadgeVisibility");

      await expect(
        updateBadgeVisibility({
          badgeId: "non-existent-badge",
          showOnPublicCard: true,
          showOnPrivateCard: true,
        })
      ).rejects.toThrow();
    });
  });

  describe("getUserBadges (Phase 2)", () => {
    it("指定ユーザーの所持バッジを取得できる", async () => {
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);
      await createTestUser(REGULAR_USER_ID, REGULAR_EMAIL);
      await setCustomClaimsAndReauth(MODERATOR_USER_ID, {moderator: true});

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");
      const grantBadge = httpsCallable(functions, "grantBadge");

      // Create two badges
      const badge1Result = await createBadge({
        name: "Badge 1",
        description: "First badge",
        priority: 1,
        isActive: true,
      });
      const badge1Id = (badge1Result.data as any).badge.badgeId;

      const badge2Result = await createBadge({
        name: "Badge 2",
        description: "Second badge",
        priority: 2,
        isActive: true,
      });
      const badge2Id = (badge2Result.data as any).badge.badgeId;

      // Grant both badges
      await grantBadge({badgeId: badge1Id, targetUserId: REGULAR_USER_ID});
      await grantBadge({badgeId: badge2Id, targetUserId: REGULAR_USER_ID});

      // Get user badges
      const getUserBadges = httpsCallable(functions, "getUserBadges");
      const result = await getUserBadges({userId: REGULAR_USER_ID});
      const badges = (result.data as any).badges;

      expect(badges.length).toBe(2);
      expect(badges.map((b: any) => b.badgeId).sort()).toEqual([badge1Id, badge2Id].sort());
    });
  });

  describe("getPublicCard with badges (Phase 2)", () => {
    it("getPublicCard のレスポンスに badges フィールドが含まれる", async () => {
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);
      await createTestUser(REGULAR_USER_ID, REGULAR_EMAIL);
      await setCustomClaimsAndReauth(MODERATOR_USER_ID, {moderator: true});

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");
      const grantBadge = httpsCallable(functions, "grantBadge");
      const getPublicCard = httpsCallable(functions, "getPublicCard");

      // Create and grant badge
      const badgeResult = await createBadge({
        name: "Public Badge",
        description: "Visible on public card",
        priority: 1,
        isActive: true,
      });
      const badgeId = (badgeResult.data as any).badge.badgeId;

      await grantBadge({badgeId, targetUserId: REGULAR_USER_ID});

      // Get public card
      const cardResult = await getPublicCard({userId: REGULAR_USER_ID});
      const publicCard = (cardResult.data as any).publicCard;

      expect(publicCard.badges).toBeDefined();
      expect(publicCard.badges).toContain(badgeId);
    });

    it("showOnPublicCard=false のバッジは getPublicCard に表示されない", async () => {
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);
      await createTestUser(REGULAR_USER_ID, REGULAR_EMAIL);
      await setCustomClaimsAndReauth(MODERATOR_USER_ID, {moderator: true});

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");
      const grantBadge = httpsCallable(functions, "grantBadge");
      const getPublicCard = httpsCallable(functions, "getPublicCard");

      // Create and grant badge
      const badgeResult = await createBadge({
        name: "Hidden Badge",
        description: "Not visible on public card",
        priority: 1,
        isActive: true,
      });
      const badgeId = (badgeResult.data as any).badge.badgeId;

      await grantBadge({badgeId, targetUserId: REGULAR_USER_ID});

      // Update visibility to hide from public card
      await setCustomClaimsAndReauth(REGULAR_USER_ID, {});
      const updateBadgeVisibility = httpsCallable(functions, "updateBadgeVisibility");
      await updateBadgeVisibility({
        badgeId,
        showOnPublicCard: false,
        showOnPrivateCard: true,
      });

      // Get public card
      const cardResult = await getPublicCard({userId: REGULAR_USER_ID});
      const publicCard = (cardResult.data as any).publicCard;

      // When no badges are visible, badges field should be undefined or falsy
      expect(publicCard.badges).toBeFalsy();
    });
  });

  describe("getPrivateCard with badges (Phase 2)", () => {
    it("getPrivateCard のレスポンスに badges フィールドが含まれる", async () => {
      await createTestUser(MODERATOR_USER_ID, MODERATOR_EMAIL);
      await createTestUser(REGULAR_USER_ID, REGULAR_EMAIL);
      await setCustomClaimsAndReauth(MODERATOR_USER_ID, {moderator: true});

      const functions = getFunctionsInstance();
      const createBadge = httpsCallable(functions, "createBadge");
      const grantBadge = httpsCallable(functions, "grantBadge");

      // Create and grant badge
      const badgeResult = await createBadge({
        name: "Private Badge",
        description: "Visible on private card",
        priority: 1,
        isActive: true,
      });
      const badgeId = (badgeResult.data as any).badge.badgeId;

      await grantBadge({badgeId, targetUserId: REGULAR_USER_ID});

      // Create private card and get it as regular user
      await setCustomClaimsAndReauth(REGULAR_USER_ID, {});
      const updateCard = httpsCallable(functions, "updateCard");
      await updateCard({email: "regular@example.com"});

      const getPrivateCard = httpsCallable(functions, "getPrivateCard");
      const cardResult = await getPrivateCard({});
      const privateCard = cardResult.data as any;

      expect(privateCard).not.toBeNull();
      expect(privateCard.badges).toBeDefined();
      expect(privateCard.badges).toContain(badgeId);
    });
  });
});
