# API Contract v0.1.0

**このファイルがバックエンドAPIの唯一の真実です。**

フロントエンド・iOS・その他のクライアントは、このファイルに記載された仕様に従ってください。

---

## エンドポイント一覧

### 1. Auth Trigger: `onUserCreate`

**種類**: Firebase Auth onCreate Trigger (自動実行)

**説明**: 新規ユーザー登録時に自動的に実行され、ユーザープロフィールと公開名刺を作成します。

**処理内容**:
- `/users/{userId}` に非公開プロフィールを作成
- `/public_cards/{userId}` に公開名刺を作成

**作成されるデータ**:
```typescript
// /users/{userId}
{
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// /public_cards/{userId}
{
  userId: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  connectedServices: {}; // 初期状態は空
  theme: "default";
  updatedAt: Timestamp;
}
```

---

### 2. Callable Function: `saveGitHubToken`

**エンドポイント**: `saveGitHubToken` (Callable Function)

**認証**: 必須

**説明**: GitHubのOAuthアクセストークンを保存します。

**リクエスト**:
```typescript
{
  accessToken: string; // GitHub OAuth access token
}
```

**レスポンス**:
```typescript
{
  success: true;
}
```

**エラー**:
- `unauthenticated`: 認証されていない場合
- `invalid-argument`: `accessToken` が不正な場合
- `internal`: サーバー内部エラー

**保存先**: `/users/{userId}` の `githubAccessToken` フィールド

---

### 3. Callable Function: `saveCard`

**エンドポイント**: `saveCard` (Callable Function)

**認証**: 必須

**説明**: 他のユーザーの公開名刺を自分のコレクションに保存します。

**リクエスト**:
```typescript
{
  cardUserId: string;    // 保存する名刺の持ち主のuserId (必須)
  memo?: string;         // メモ (任意)
  tags?: string[];       // タグ (任意)
  eventId?: string;      // イベントID (任意)
  badge?: string;        // バッジ (任意、例: "VIP", "Speaker")
}
```

**レスポンス**:
```typescript
{
  success: true;
  savedCard: {
    cardUserId: string;
    savedAt: Timestamp;
    memo?: string;
    tags?: string[];
    eventId?: string;
    badge?: string;
  }
}
```

**エラー**:
- `unauthenticated`: 認証されていない場合
- `invalid-argument`: `cardUserId` が不正な場合
- `not-found`: 指定された公開名刺が存在しない場合
- `already-exists`: すでに保存済みの場合
- `internal`: サーバー内部エラー

**保存先**: `/users/{userId}/saved_cards/{cardUserId}`

---

### 4. Callable Function: `updateProfile`

**エンドポイント**: `updateProfile` (Callable Function)

**認証**: 必須（自分のプロフィールのみ更新可能）

**説明**: ユーザーが自分のプロフィール情報を更新します。`/users/{userId}`（非公開プロフィール）と `/public_cards/{userId}`（公開名刺）の両方が更新されます。

**リクエスト**:
```typescript
{
  displayName?: string;  // 表示名（任意、1-100文字）
  bio?: string;          // 自己紹介文（任意、0-500文字）
  photoURL?: string;     // プロフィール写真URL（任意、HTTPS必須）
}
```

**バリデーション**:
- `displayName`: 1文字以上100文字以下
- `bio`: 500文字以下（空文字列可）
- `photoURL`: 有効なHTTPS URL形式

**レスポンス**:
```typescript
{
  success: true;
}
```

**エラー**:
- `unauthenticated`: 認証されていない場合
- `invalid-argument`: 以下の場合
  - フィールドの型が不正
  - 全フィールドが未指定
  - `displayName` が1文字未満または100文字超
  - `bio` が500文字超
  - `photoURL` が無効なURL形式またはHTTPS以外のプロトコル
- `not-found`: ユーザーまたは公開名刺が存在しない場合
- `internal`: サーバー内部エラー

**更新対象**:
- `/users/{userId}`: `displayName`, `photoURL`, `updatedAt`
- `/public_cards/{userId}`: `displayName`, `bio`, `photoURL`, `updatedAt`

**注意事項**:
- 少なくとも1つのフィールド（`displayName`、`bio`、または `photoURL`）を指定する必要があります
- 未指定のフィールドは更新されません
- 両方のコレクションが自動的に同期されます

---

### 5. Callable Function: `getPublicCard`

**エンドポイント**: `getPublicCard` (Callable Function)

**認証**: 不要（公開情報）

**説明**: 公開名刺（PublicCard）を取得します。認証不要で誰でも閲覧可能。Webでの名刺共有を実現するための基本機能。

**リクエスト**:
```typescript
{
  userId: string;  // 取得したい名刺の持ち主のuserId（必須）
}
```

**バリデーション**:
- `userId`: 必須、非空文字列

**レスポンス**:
```typescript
{
  success: true;
  publicCard: {
    userId: string;
    displayName: string;
    photoURL?: string;
    bio?: string;
    connectedServices: Record<string, ConnectedService>;
    theme: string;
    customCss?: string;
    updatedAt: string; // ISO 8601形式
  }
}
```

**エラー**:
- `invalid-argument`: `userId` が不正な形式（空文字列、null、undefined等）
- `not-found`: 指定された公開名刺が存在しない場合
- `internal`: サーバー内部エラー

**参照データ**:
- `/public_cards/{userId}` を読み取り専用で取得

**注意事項**:
- 認証不要のため、公開URLから誰でもアクセス可能
- Webページ `https://devcard.com/{userId}` での利用を想定

---

### 6. Callable Function: `getSavedCards`

**エンドポイント**: `getSavedCards` (Callable Function)

**認証**: 必須

**説明**: 保存した名刺の一覧を、公開名刺の詳細情報と共に取得します。

**リクエスト**: なし

**レスポンス**:
```typescript
{
  success: true;
  savedCards: Array<{
    // SavedCard metadata
    cardUserId: string;
    savedAt: Timestamp;
    memo?: string;
    tags?: string[];
    eventId?: string;
    badge?: string;

    // PublicCard details (joined)
    displayName: string;
    photoURL?: string;
    bio?: string;
    connectedServices: Record<string, ConnectedService>;
    theme: string;
    customCss?: string;
  }>
}
```

**エラー**:
- `unauthenticated`: 認証されていない場合
- `internal`: サーバー内部エラー

---

## リクエスト/レスポンスの基本形

### 認証方法

Callable Functionsは、Firebase Authenticationのトークンを自動的に検証します。

クライアントは以下の方法で認証済みのリクエストを送信してください：

```typescript
// JavaScript/TypeScript (Firebase SDK)
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

const functions = getFunctions();
const saveCard = httpsCallable(functions, 'saveCard');

// 自動的に認証トークンが付与される
const result = await saveCard({ cardUserId: 'user123' });
```

### 共通レスポンス形式

すべての成功レスポンスは以下の形式を含みます：

```typescript
{
  success: true;
  // ... その他のデータ
}
```

---

## エラーフォーマット

### エラーコード

Firebase Functions v2の `HttpsError` を使用します。

| コード | 説明 | HTTPステータス |
|--------|------|---------------|
| `unauthenticated` | 認証されていない | 401 |
| `permission-denied` | 権限がない | 403 |
| `not-found` | リソースが見つからない | 404 |
| `already-exists` | リソースが既に存在する | 409 |
| `invalid-argument` | 引数が不正 | 400 |
| `internal` | サーバー内部エラー | 500 |

### エラーレスポンス構造

```typescript
{
  code: string;      // エラーコード (上記参照)
  message: string;   // エラーメッセージ
  details?: any;     // 追加の詳細情報 (任意)
}
```

### エラーハンドリング例

```typescript
try {
  const result = await saveCard({ cardUserId: 'user123' });
} catch (error) {
  if (error.code === 'unauthenticated') {
    // ログイン画面へ遷移
  } else if (error.code === 'not-found') {
    // 名刺が見つからない旨を表示
  } else {
    // 一般的なエラー処理
  }
}
```

---

## データ型定義

### Timestamp

Firestore の日時データは、環境によって異なる形式で扱われます：

**Firestoreから取得時**:
- Firebase Admin SDK（サーバー側）: `Timestamp` オブジェクト
- Firebase Client SDK（Web/モバイル）: `Timestamp` オブジェクト

**JSON シリアライゼーション時**:
- HTTP レスポンスやJSON形式での転送時: ISO 8601形式の文字列
- 形式: `YYYY-MM-DDTHH:mm:ss.sssZ`
- 例: `"2025-10-26T06:52:30.123Z"`

**TypeScript型定義**:
```typescript
// Firestore内部では
createdAt: Timestamp

// JSON APIレスポンスでは
createdAt: string  // ISO 8601形式
```

### ConnectedService

```typescript
interface ConnectedService {
  serviceName: string;  // "github", "qiita", "zenn", "x"
  username: string;
  profileUrl: string;
  avatarUrl?: string;
  bio?: string;
  stats?: Record<string, number | string>; // サービス固有の統計情報
}
```

---

## 備考

- バージョン: **v0.1.0** (初回リリース)
- この契約は段階的に拡張されます
- 変更履歴は `CHANGELOG.md` を参照してください
- 機械可読な仕様は `openapi.yaml` に記載されます（将来的に）

