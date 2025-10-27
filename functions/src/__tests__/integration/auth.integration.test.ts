/**
 * Integration tests for onUserCreate Auth Trigger
 * Based on API Contract v0.7.0: contracts/API_CONTRACT.md lines 11-60
 */

import {
  setupTestEnvironment,
  cleanupTestData,
  teardownTestEnvironment,
  getFirestoreInstance,
  getAuthInstance,
} from "./setup";
import {createUserWithEmailAndPassword} from "firebase/auth";
import {doc, getDoc} from "firebase/firestore";

describe("onUserCreate Auth Trigger Integration Tests", () => {
  let firestore: ReturnType<typeof getFirestoreInstance>;
  let auth: ReturnType<typeof getAuthInstance>;

  beforeAll(async () => {
    await setupTestEnvironment();
    firestore = getFirestoreInstance();
    auth = getAuthInstance();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  describe("Contract: onUserCreate trigger creates user and public_card", () => {
    it("新規ユーザー登録時に /users/{userId} と /public_cards/{userId} が自動作成される", async () => {
      const email = `newuser-${Date.now()}@example.com`;
      const password = "password123";

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      // Wait for async trigger to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Contract: /users/{userId} must exist
      const userDoc = await getDoc(doc(firestore, "users", userId));
      expect(userDoc.exists()).toBe(true);

      const userData = userDoc.data();
      expect(userData?.userId).toBe(userId);
      expect(userData?.email).toBe(email);
      expect(userData?.displayName).toBeDefined();
      expect(userData?.createdAt).toBeDefined();
      expect(userData?.updatedAt).toBeDefined();

      // Contract: /public_cards/{userId} must exist
      const publicCardDoc = await getDoc(doc(firestore, "public_cards", userId));
      expect(publicCardDoc.exists()).toBe(true);

      const publicCardData = publicCardDoc.data();
      expect(publicCardData?.userId).toBe(userId);
      expect(publicCardData?.displayName).toBeDefined();
      expect(publicCardData?.connectedServices).toEqual({});
      expect(publicCardData?.theme).toBe("default");
      expect(publicCardData?.updatedAt).toBeDefined();
    });
  });

  describe("Contract: displayName generation logic", () => {
    it("メールアドレスの@の前を抽出してサニタイズ: test@example.com → test", async () => {
      const email = `test-${Date.now()}@example.com`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, "password123");
      const userId = userCredential.user.uid;

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Contract: test-{timestamp} → test{timestamp} (remove special chars)
      const userDoc = await getDoc(doc(firestore, "users", userId));
      expect(userDoc.data()?.displayName).toMatch(/^test\d+$/);

      const publicCardDoc = await getDoc(doc(firestore, "public_cards", userId));
      // Both should have the same sanitized displayName
      expect(publicCardDoc.data()?.displayName).toMatch(/^test\d+$/);
    });

    it("特殊文字を削除: user.name+tag@example.com → usernametag", async () => {
      const email = "user.name+tag@example.com";
      const userCredential = await createUserWithEmailAndPassword(auth, email, "password123");
      const userId = userCredential.user.uid;

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const userDoc = await getDoc(doc(firestore, "users", userId));
      expect(userDoc.data()?.displayName).toBe("usernametag");
    });

    it("特殊文字を削除: 太郎.tanaka@example.jp → tanaka", async () => {
      const email = "太郎.tanaka@example.jp";
      const userCredential = await createUserWithEmailAndPassword(auth, email, "password123");
      const userId = userCredential.user.uid;

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const userDoc = await getDoc(doc(firestore, "users", userId));
      expect(userDoc.data()?.displayName).toBe("tanaka");
    });

    it("全ての文字が削除された場合 'user' にフォールバック", async () => {
      const email = "+++@example.com";
      const userCredential = await createUserWithEmailAndPassword(auth, email, "password123");
      const userId = userCredential.user.uid;

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const userDoc = await getDoc(doc(firestore, "users", userId));
      expect(userDoc.data()?.displayName).toBe("user");
    });
  });

  describe("Contract: async execution behavior", () => {
    it("トリガーは非同期で実行される（即座には完了しない）", async () => {
      const email = "async@example.com";
      const userCredential = await createUserWithEmailAndPassword(auth, email, "password123");
      const userId = userCredential.user.uid;

      // Without waiting, the document may not exist yet (async trigger)
      // We just verify the call doesn't throw

      // After waiting, it should exist
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const delayedDoc = await getDoc(doc(firestore, "users", userId));
      expect(delayedDoc.exists()).toBe(true);
    });
  });

  describe("Contract: public_card structure", () => {
    it("connectedServices は初期状態で空オブジェクト", async () => {
      const email = "services@example.com";
      const userCredential = await createUserWithEmailAndPassword(auth, email, "password123");
      const userId = userCredential.user.uid;

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const publicCardDoc = await getDoc(doc(firestore, "public_cards", userId));
      expect(publicCardDoc.data()?.connectedServices).toEqual({});
    });

    it("theme は 'default' に設定される", async () => {
      const email = "theme@example.com";
      const userCredential = await createUserWithEmailAndPassword(auth, email, "password123");
      const userId = userCredential.user.uid;

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const publicCardDoc = await getDoc(doc(firestore, "public_cards", userId));
      expect(publicCardDoc.data()?.theme).toBe("default");
    });
  });
});
