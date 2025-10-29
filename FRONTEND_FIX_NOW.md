# 🚨 フロントエンド緊急対応: ユーザー作成問題の解決方法

## ✅ バックエンドは完全に正常動作

**3つのテストで検証済み:**

```bash
# Test 1: onUserCreate trigger動作確認
$ npx ts-node src/__tests__/manual/testAuthTrigger.ts
✅✅✅ TEST PASSED: onUserCreate trigger is working correctly

# Test 2: フロントエンド完全再現
$ npx ts-node src/__tests__/manual/simulateFrontendFlow.ts
✅✅✅ ALL CHECKS PASSED - Frontend flow works correctly

# Test 3: 特定ユーザー確認
$ npx ts-node src/__tests__/manual/checkSpecificUser.ts
❌ User Xu5o6jtsR8n7aCKGIdgiUOvx6ykj NOT FOUND
```

**結論: ユーザーID `Xu5o6jtsR8n7aCKGIdgiUOvx6ykj` はエミュレータに存在しない = フロントエンドが別環境に接続している**

---

## 🔧 フロントエンド側で今すぐ確認すべきこと

### 1. エミュレータに接続しているか確認

**フロントエンドのコンソールで実行:**

```javascript
// Firebase設定確認
console.log('Project ID:', firebase.app().options.projectId);
console.log('Auth Emulator:', firebase.auth().emulatorConfig);
```

**期待値:**
```
Project ID: dev-card-ae929
Auth Emulator: { host: "127.0.0.1:9099", options: { disableWarnings: true } }
```

**もしnullなら:** エミュレータに接続されていない → 本番環境に接続している

---

### 2. エミュレータ接続コードがあるか確認

**フロントエンドの初期化コードに以下が必要:**

```typescript
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Firebase初期化
const app = initializeApp({
  apiKey: "YOUR_API_KEY",
  projectId: "dev-card-ae929",
  // ... その他の設定
});

const auth = getAuth(app);
const firestore = getFirestore(app);
const functions = getFunctions(app);

// 🚨 これが必須 🚨
if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_EMULATOR) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  console.log("✅ Connected to Firebase Emulators");
}
```

---

### 3. リトライロジックを実装する

**契約 (API_CONTRACT.md) に明記:**

> ⚠️ 重要: 非同期実行
> - この処理はFirebase Auth Triggerであり、**バックグラウンドで非同期に実行**されます
> - ユーザー作成直後に `getPublicCard` を呼び出すと、`not-found` エラーが返される場合があります
> - **推奨対応**: フロントエンドでリトライロジックを実装してください（例: 500ms待機後に再取得、最大3回まで）

**実装例:**

```typescript
async function createUserAndFetchCard(email: string, password: string) {
  // Step 1: ユーザー作成
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const userId = userCredential.user.uid;

  console.log(`User created: ${userId}`);

  // Step 2: public_card取得（リトライあり）
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      // 500ms待機（i=0なら500ms、i=1なら1000ms、i=2なら1500ms）
      const waitTime = 500 * (i + 1);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      const getPublicCard = httpsCallable(functions, 'getPublicCard');
      const result = await getPublicCard({ userId });

      console.log(`✅ Public card fetched on retry ${i + 1}`);
      return result.data;

    } catch (error: any) {
      console.log(`Retry ${i + 1}/${maxRetries} failed:`, error.message);

      if (i === maxRetries - 1) {
        // 最終リトライも失敗
        throw new Error(`Failed to fetch public card after ${maxRetries} retries`);
      }
    }
  }
}
```

---

## 🧪 バックエンド側で検証済みの動作

**Test 2の結果:**

```
Step 1: User registration
✅ User created: 8zBorXwSzJeLJtENuElSO6x17wCh

Step 2: Immediate getPublicCard (may fail due to async trigger)
❌ IMMEDIATE FAILURE (expected): Public card not found

Step 3: Retry with exponential backoff
Retry 1/3: Waiting 500ms...
✅ SUCCESS on retry 1: getPublicCard returned data

Public Card: {
  "userId": "8zBorXwSzJeLJtENuElSO6x17wCh",
  "displayName": "frontendtest1761553379713",
  "theme": "default",
  "connectedServices": {},
  ...
}
```

**つまり:**
1. ユーザー作成直後 → ❌ 失敗（正常）
2. 500ms待機後 → ✅ 成功（正常）

---

## 📋 チェックリスト

フロントエンドチームは以下を確認してください:

- [ ] エミュレータ接続コードが存在する (`connectAuthEmulator` など)
- [ ] 開発環境で実際にエミュレータに接続されている（コンソールで確認）
- [ ] ユーザー作成後のリトライロジックが実装されている
- [ ] エミュレータUIで作成されたユーザーが見える (http://127.0.0.1:4000/auth)
- [ ] エミュレータUIで public_cards が見える (http://127.0.0.1:4000/firestore)

---

## 🆘 それでも動かない場合

1. **エミュレータを再起動:**
   ```bash
   # バックエンド側
   pkill -f firebase
   cd /path/to/backend
   firebase emulators:start
   ```

2. **フロントエンドを再起動:**
   ```bash
   # キャッシュクリア
   npm start
   ```

3. **ブラウザのキャッシュをクリア:**
   - DevTools → Application → Clear storage

4. **バックエンドチームに連絡:**
   - エミュレータのログを共有
   - ブラウザのコンソールログを共有
   - Network タブのエラーを共有

---

## 📞 バックエンド側の確認スクリプト

バックエンドチームはこれらのスクリプトで動作確認済み:

```bash
cd functions

# Test 1: Trigger動作確認
npx ts-node src/__tests__/manual/testAuthTrigger.ts

# Test 2: フロントエンドフロー再現
npx ts-node src/__tests__/manual/simulateFrontendFlow.ts

# Test 3: 特定ユーザー確認
npx ts-node src/__tests__/manual/checkSpecificUser.ts
```

すべて `functions/src/__tests__/manual/` に配置済み。
