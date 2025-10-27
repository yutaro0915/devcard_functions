# フロントエンドとバックエンドの接続問題デバッグ

## 状況

**フロントエンドからの報告:**
- ユーザーID `Xu5o6jtsR8n7aCKGIdgiUOvx6ykj` のFirestoreドキュメントが存在しない
- onUserCreate triggerが発火していない

## バックエンド側の調査結果

### ✅ onUserCreate trigger は正常に動作している

```bash
$ npx ts-node src/__tests__/manual/testAuthTrigger.ts

✅✅✅ TEST PASSED: onUserCreate trigger is working correctly
```

**検証内容:**
1. Firebase Auth Emulatorでユーザー作成
2. onUserCreate trigger自動発火
3. `/users/{userId}` 作成確認
4. `/public_cards/{userId}` 作成確認
5. displayName サニタイズ確認

**結果:** 契約通りに動作

### ❌ 報告されたユーザーIDがエミュレータに存在しない

```bash
$ npx ts-node src/__tests__/manual/checkSpecificUser.ts

❌ User NOT FOUND in Firebase Auth
❌ /users document NOT FOUND
❌ /public_cards document NOT FOUND
```

**ユーザーID:** `Xu5o6jtsR8n7aCKGIdgiUOvx6ykj`

## 問題の原因

**フロントエンドとバックエンドが異なる環境に接続している**

### 可能性1: フロントエンドが本番環境に接続している

フロントエンドが `https://dev-card-ae929.firebaseapp.com` (本番) に接続していませんか？

**確認方法:**
```typescript
// フロントエンドのコンソールで実行
console.log(firebase.app().options);
```

**期待値 (エミュレータ):**
```javascript
{
  projectId: "dev-card-ae929",
  // エミュレータ設定がある
}
```

### 可能性2: エミュレータ接続設定が不足

フロントエンドで以下の設定が必要です:

```typescript
// Firebase初期化後
import { connectAuthEmulator } from "firebase/auth";
import { connectFirestoreEmulator } from "firebase/firestore";
import { connectFunctionsEmulator } from "firebase/functions";

const auth = getAuth();
const firestore = getFirestore();
const functions = getFunctions();

// エミュレータに接続 (開発環境のみ)
if (process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
```

### 可能性3: エミュレータが起動していない/再起動が必要

**確認:**
```bash
# バックエンド側で確認
ps aux | grep firebase

# エミュレータログを確認
# ターミナルで firebase emulators:start を実行しているウィンドウを確認
```

**エミュレータUIで確認:**
http://127.0.0.1:4000

## フロントエンドチームへの質問

### 1. Firebase接続先の確認

フロントエンドのコンソールで以下を実行してください:

```javascript
// 1. Firebase Appの設定確認
console.log('Firebase config:', firebase.app().options);

// 2. Auth接続先確認
console.log('Auth host:', firebase.auth().emulatorConfig);

// 3. Firestore接続先確認
console.log('Firestore settings:', firebase.firestore()._settingsFrozen);
```

### 2. ユーザー作成の実際のコード

どのようにユーザーを作成していますか？

```typescript
// 例1: createUserWithEmailAndPassword
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const auth = getAuth();
const userCredential = await createUserWithEmailAndPassword(auth, email, password);
const user = userCredential.user;
console.log('Created user:', user.uid);
```

### 3. エミュレータ接続の確認

フロントエンドのコードに以下が含まれていますか？

```typescript
connectAuthEmulator(auth, "http://127.0.0.1:9099");
connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
connectFunctionsEmulator(functions, "127.0.0.1", 5001);
```

## バックエンド側の対応

### エミュレータの起動確認

```bash
cd /Users/cherie/dev/devcard
firebase emulators:start
```

### エミュレータUI

http://127.0.0.1:4000

- **Authentication**: http://127.0.0.1:4000/auth
- **Firestore**: http://127.0.0.1:4000/firestore
- **Functions**: http://127.0.0.1:4000/functions

### ログ確認

onUserCreate triggerが発火したかログで確認:

```bash
# エミュレータのログを監視
# ユーザー作成時に以下のログが出力されるはず:
# "Creating user profile and public card"
# "User profile and public card created successfully"
```

## 次のステップ

1. **フロントエンド**: 上記3つの質問に回答
2. **バックエンド**: エミュレータログを監視
3. **両方**: エミュレータUIで同じデータが見えるか確認

## テストスクリプト

バックエンド側で動作確認済み:

```bash
# Auth trigger動作確認
npx ts-node src/__tests__/manual/testAuthTrigger.ts

# 特定ユーザー確認
npx ts-node src/__tests__/manual/checkSpecificUser.ts
```

両方とも `functions/src/__tests__/manual/` に配置済み
