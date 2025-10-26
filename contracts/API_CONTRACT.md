# API Contract v0.2.0

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

**説明**: 他のユーザーの公開名刺を自分のコレクションに保存します。同じユーザーの名刺を複数回保存可能（イベント別など）。

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
  savedCardId: string;   // ランダム生成されたID
  savedCard: {
    savedCardId: string;
    cardUserId: string;
    cardType: "public";
    savedAt: Timestamp;
    lastKnownUpdatedAt: Timestamp;  // 保存時の相手のupdatedAt
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
- `internal`: サーバー内部エラー

**保存先**: `/users/{userId}/saved_cards/{randomId}` (ランダムID使用)

**変更点 (v0.2.0)**:
- ドキュメントIDがランダムIDに変更（同じユーザーを複数回保存可能）
- `savedCardId` フィールド追加
- `cardType: "public"` 固定値追加
- `lastKnownUpdatedAt` 追加（更新検知用）
- `already-exists` エラーを削除（同じユーザーを複数回保存可能に）

---

### 4. Callable Function: `updateProfile`

**エンドポイント**: `updateProfile` (Callable Function)

**認証**: 必須（自分のプロフィールのみ更新可能）

**説明**: ユーザーが自分のプロフィール情報を更新します。`/users/{userId}`、`/public_cards/{userId}`、および `/private_cards/{userId}`（存在する場合）の3箇所がトランザクションで同期更新されます。

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
- `/private_cards/{userId}`: `displayName`, `photoURL`, `updatedAt` (存在する場合のみ)

**注意事項**:
- 少なくとも1つのフィールド（`displayName`、`bio`、または `photoURL`）を指定する必要があります
- 未指定のフィールドは更新されません
- 3箇所がFirestoreトランザクションで原子的に更新されます（失敗時は全てロールバック）
- PrivateCardが存在しない場合は、User/PublicCardのみ更新されます

**変更点 (v0.2.0)**:
- PrivateCardの同期更新を追加（displayName, photoURL）
- トランザクション処理で原子性を担保

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

**説明**: 保存した名刺の一覧を、最新のマスターカード情報と共に取得します。PublicCardとPrivateCardの両方に対応し、統一された更新検知ロジック（hasUpdate）を提供します。

**⚠️ 破壊的変更 (v0.2.0)**: レスポンス構造が大幅に変更されました。

**リクエスト**:
```typescript
{
  cardType?: "public" | "private";  // フィルター (任意)
  eventId?: string;                 // イベントIDでフィルター (任意)
  limit?: number;                   // 取得件数 (任意、1-500、デフォルト100)
}
```

**レスポンス**:
```typescript
{
  success: true;
  savedCards: Array<{
    // SavedCard metadata (全cardTypeで共通)
    savedCardId: string;               // ランダム生成されたID
    cardUserId: string;
    cardType: "public" | "private";    // カードタイプ
    savedAt: string;                   // ISO 8601形式
    lastKnownUpdatedAt?: string;       // 最後に知っている相手のupdatedAt
    lastViewedAt?: string;             // 最後に表示した時刻
    hasUpdate: boolean;                // 更新検知: lastKnownUpdatedAt < master.updatedAt
    memo?: string;
    tags?: string[];
    eventId?: string;
    badge?: string;

    // Master card details (cardTypeによって異なる)
    displayName: string;
    photoURL?: string;
    updatedAt: string;                 // マスターカードのupdatedAt
    isDeleted?: boolean;               // マスターが削除済みの場合true

    // Public card specific fields (cardType='public'の場合のみ)
    bio?: string;
    connectedServices?: Record<string, ConnectedService>;
    theme?: string;
    customCss?: string;

    // Private card specific fields (cardType='private'の場合のみ)
    email?: string;
    phoneNumber?: string;
    lineId?: string;
    discordId?: string;
    twitterHandle?: string;
    otherContacts?: string;
  }>
}
```

**更新検知ロジック**:
```typescript
hasUpdate = !lastKnownUpdatedAt || lastKnownUpdatedAt < master.updatedAt
```

**エラー**:
- `unauthenticated`: 認証されていない場合
- `invalid-argument`: 以下の場合
  - `cardType` が "public" または "private" 以外
  - `limit` が1未満または500超
- `internal`: サーバー内部エラー

**注意事項**:
- SavedCardはスナップショットではなく、**常に最新のマスターカードを参照**します
- 相手がGitHub同期やプロフィール変更をすると、即座に反映されます
- `hasUpdate=true` の場合、「最新版があります！」バッジを表示することを推奨
- 名刺詳細を表示したら `markAsViewed` を呼び出して `hasUpdate` をfalseにしてください
- `isDeleted=true` の場合、マスターカードが削除済みです（「この名刺は削除されました」と表示を推奨）

**変更点 (v0.2.0)**:
- リクエストに `cardType`, `eventId`, `limit` フィルター追加
- `savedCardId`, `cardType`, `hasUpdate`, `lastViewedAt`, `lastKnownUpdatedAt` フィールド追加
- 条件付きフィールド: cardTypeによって返却される情報が異なる
- PublicとPrivate両方をサポート
- 統一された更新検知ロジック

---

### 7. Callable Function: `manualSync`

**エンドポイント**: `manualSync` (Callable Function)

**認証**: 必須（自分のデータのみ同期可能）

**説明**: 保存済みの外部サービストークンを使用して、サービスの最新情報を公開名刺に手動で同期します。現在はGitHub基本情報（username, name, avatarUrl, bio, profileUrl）のみ対応。

**リクエスト**:
```typescript
{
  services: string[];  // 同期するサービスのリスト（例: ["github"]）
}
```

**バリデーション**:
- `services`: 必須、非空配列
- 配列の各要素は文字列型である必要があります
- 現在サポート: `["github"]`（将来的に "qiita", "zenn" などを追加予定）

**レスポンス**:
```typescript
{
  success: true;
  syncedServices: string[];  // 成功した同期のリスト（例: ["github"]）
  errors?: Array<{
    service: string;
    error: "token-not-found" | "token-expired" | "api-error";
  }>;
}
```

**エラー**:
- `unauthenticated`: 認証されていない場合
- `invalid-argument`: 以下の場合
  - `services` フィールドが未指定
  - `services` が配列以外
  - `services` が空配列
  - `services` の要素に文字列以外が含まれる
- `not-found`: ユーザーまたは公開名刺が存在しない場合
- `internal`: サーバー内部エラー

**同期エラー（`errors[]` 内）**:
- `token-not-found`: 指定サービスのトークンが保存されていない
- `token-expired`: トークンの有効期限切れ（再認証が必要）
- `api-error`: 外部APIエラー（ネットワークエラー、5xx等）

**処理フロー**:
1. 認証済みユーザーのIDを取得
2. `/users/{userId}` から各サービスのアクセストークンを取得
3. 外部API（GitHub等）を呼び出して最新情報を取得
4. `/public_cards/{userId}` の `connectedServices` を更新

**更新されるデータ（GitHub の場合）**:
```typescript
connectedServices: {
  github: {
    serviceName: "github";
    username: string;        // GitHubユーザー名
    profileUrl: string;      // https://github.com/{username}
    avatarUrl: string;       // プロフィール画像URL
    bio?: string;            // GitHub上の自己紹介
    stats?: {
      name?: string;         // 実名（GitHub上で設定されている場合）
    };
  }
}
```

**注意事項**:
- 認可: 自分自身のデータのみ同期可能（UserIDはリクエストから受け取らず、認証済みユーザーのIDを使用）
- 部分成功: 一部のサービス同期が失敗しても、成功したものは反映される
- 既存サービス保持: 同期対象外のサービス情報は保持される
- トークン保護: アクセストークンはログに出力されない

**変更点 (v0.2.0)**:
- **同期成功時のみ `PublicCard.updatedAt` を更新**（エラー時は更新しない）
- これにより、保存済み名刺の更新検知（`hasUpdate`）が正しく機能します
- 例: GitHub同期でリポジトリ追加 → `PublicCard.updatedAt`更新 → 保存している人に「最新版があります！」通知

---

### 8. Callable Function: `updatePrivateCard`

**エンドポイント**: `updatePrivateCard` (Callable Function)

**認証**: 必須（自分のPrivateCardのみ編集可能）

**説明**: 個人連絡先情報（PrivateCard）を作成・更新します。初回呼び出し時に `/private_cards/{userId}` が作成され、2回目以降は部分更新されます。

**リクエスト**:
```typescript
{
  email?: string;           // メールアドレス (任意、最大255文字、email形式)
  phoneNumber?: string;     // 電話番号 (任意、最大50文字)
  lineId?: string;          // LINE ID (任意、最大100文字)
  discordId?: string;       // Discord ID (任意、最大100文字)
  twitterHandle?: string;   // Twitterハンドル (任意、最大15文字)
  otherContacts?: string;   // その他連絡先 (任意、最大500文字)
}
```

**バリデーション**:
- 少なくとも1つのフィールドが必須
- `email`: 有効なメールアドレス形式、255文字以下
- `phoneNumber`: 50文字以下
- `lineId`, `discordId`: 100文字以下
- `twitterHandle`: 15文字以下
- `otherContacts`: 500文字以下

**レスポンス**:
```typescript
{
  success: true;
}
```

**エラー**:
- `unauthenticated`: 認証されていない場合
- `invalid-argument`: 以下の場合
  - 全フィールドが未指定
  - フィールドの型が不正
  - `email` が無効な形式
  - 文字列長制限超過
- `internal`: サーバー内部エラー

**保存先**: `/private_cards/{userId}`

**注意事項**:
- 初回呼び出し時: ドキュメントを新規作成（displayName, photoURLは現在のUserから自動コピー）
- 2回目以降: 指定されたフィールドのみ部分更新（未指定フィールドは保持）
- `displayName`, `photoURL` は `updateProfile` で更新されると自動同期されます
- 何か一つでも変更されたら `updatedAt` が必ず更新されます

---

### 9. Callable Function: `getPrivateCard`

**エンドポイント**: `getPrivateCard` (Callable Function)

**認証**: 必須（自分のPrivateCardのみ取得可能）

**説明**: 自分の個人連絡先情報（PrivateCard）を取得します。他人のPrivateCardは取得できません。

**リクエスト**: なし

**レスポンス**:
```typescript
{
  userId: string;
  displayName: string;
  photoURL?: string;
  email?: string;
  phoneNumber?: string;
  lineId?: string;
  discordId?: string;
  twitterHandle?: string;
  otherContacts?: string;
  updatedAt: string;  // ISO 8601形式
} | null  // PrivateCardが未作成の場合null
```

**エラー**:
- `unauthenticated`: 認証されていない場合
- `internal`: サーバー内部エラー

**注意事項**:
- PrivateCardが未作成の場合は `null` を返します
- セキュリティ: 他人のPrivateCardは絶対に取得できません（認証済みユーザーIDのみ使用）

---

### 10. Callable Function: `savePrivateCard`

**エンドポイント**: `savePrivateCard` (Callable Function)

**認証**: 必須

**説明**: トークンを使用して、他のユーザーのPrivateCardを保存します。トークンは1分間有効で、1回のみ使用可能です。

**リクエスト**:
```typescript
{
  tokenId: string;  // 交換トークンID (必須)
}
```

**レスポンス**:
```typescript
{
  success: true;
  savedCardId: string;  // 保存されたsavedCardのID
}
```

**エラー**:
- `unauthenticated`: 認証されていない場合
- `invalid-argument`: 以下の場合
  - `tokenId` が未指定
  - トークンの所有者が自分自身（自分のトークンは使用不可）
  - トークンが期限切れ（作成から1分超過）
  - トークンが使用済み
- `not-found`: トークンが存在しない、またはPrivateCardが存在しない
- `internal`: サーバー内部エラー

**トークン検証**:
1. **所有者チェック**: トークンの所有者が自分自身の場合エラー
2. **有効期限チェック**: トークン作成から1分以内であることを確認
3. **使用状況チェック**: トークンが未使用であることを確認

**保存先**: `/users/{userId}/saved_cards/{randomId}`

**保存内容**:
```typescript
{
  savedCardId: string;
  cardUserId: string;           // トークン所有者のuserId
  cardType: "private";
  savedAt: Timestamp;
  lastKnownUpdatedAt: Timestamp; // 相手のPrivateCard.updatedAt
}
```

**注意事項**:
- トークンは `/exchange_tokens/{tokenId}` に保存されています（将来的にQRコード/AirDropでの交換を想定）
- 使用後、トークンは `usedBy`, `usedAt` フィールドでマークされ、再利用不可になります
- セキュリティ: 自分のトークンは使用できません

---

### 11. Callable Function: `markAsViewed`

**エンドポイント**: `markAsViewed` (Callable Function)

**認証**: 必須

**説明**: 保存済み名刺を「閲覧済み」としてマークします。`lastViewedAt` と `lastKnownUpdatedAt` を更新し、次回の `getSavedCards` で `hasUpdate=false` になります。

**リクエスト**:
```typescript
{
  savedCardId: string;  // 保存済み名刺のID (必須)
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
- `invalid-argument`: `savedCardId` が未指定
- `not-found`: 指定されたsavedCardが存在しない、または他人のsavedCard
- `internal`: サーバー内部エラー

**更新内容**:
```typescript
{
  lastViewedAt: Timestamp;          // 現在時刻
  lastKnownUpdatedAt: Timestamp;    // マスターカードの最新updatedAt
}
```

**注意事項**:
- PublicCard/PrivateCard両方に対応（cardTypeを問わず同じ動作）
- 名刺詳細画面を表示した際に呼び出すことを推奨
- これにより「最新版があります！」バッジが消えます

---

### 12. Callable Function: `deleteSavedCard`

**エンドポイント**: `deleteSavedCard` (Callable Function)

**認証**: 必須

**説明**: 保存済み名刺を削除します。PublicCard/PrivateCard両方に対応。

**リクエスト**:
```typescript
{
  savedCardId: string;  // 保存済み名刺のID (必須)
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
- `invalid-argument`: `savedCardId` が未指定
- `not-found`: 指定されたsavedCardが存在しない、または他人のsavedCard
- `internal`: サーバー内部エラー

**削除対象**: `/users/{userId}/saved_cards/{savedCardId}`

**注意事項**:
- 自分の保存済み名刺のみ削除可能（他人の名刺は削除できない）
- 削除されるのはSavedCardのみ（マスターのPublicCard/PrivateCardは削除されません）

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

- バージョン: **v0.2.0** (PrivateCard機能とSavedCard統合)
- この契約は段階的に拡張されます
- 変更履歴は `CHANGELOG.md` を参照してください
- 機械可読な仕様は `openapi.yaml` に記載されます（将来的に）

