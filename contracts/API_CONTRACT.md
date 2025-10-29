# API Contract v0.7.0

**このファイルがバックエンドAPIの唯一の真実です。**

フロントエンド・iOS・その他のクライアントは、このファイルに記載された仕様に従ってください。

---

## 🚨 v0.7.0 重要な変更 (Unified Card Model)

**データモデルの統合** (Issue #68対応):
- `/public_cards` と `/private_cards` コレクションを単一の `/cards` コレクションに統合
- **フラット構造**: すべてのフィールド（公開/非公開）がルートレベルに配置され、ネストされた `privateContacts` オブジェクトは使用しません
- パフォーマンス向上: プロフィール更新時のトランザクション処理が不要に

**技術的な詳細**:
- `/cards/{userId}` に公開情報とプライベート情報を格納
- フラット構造: `email`, `phoneNumber`, `line`, `discord`, `x` などすべてのフィールドがルートレベル
- `visibility` フィールドで各フィールドの公開範囲を制御（public/private/hidden）
- デフォルト可視性ルール:
  - 連絡先/メッセージングフィールド（`email`, `phoneNumber`, `line`, `discord`, `telegram`, `slack`, `otherContacts`）: `"private"`
  - SNSフィールド（`github`, `x`, `linkedin`, `instagram`, `facebook`, `zenn`, `qiita`, `website`, `blog`, `youtube`, `twitch`）: `"public"`

**後方互換性**:
- 旧フィールド名も引き続きサポート:
  - `lineId` → `line` (新しい名前を優先)
  - `discordId` → `discord` (新しい名前を優先)
  - `twitterHandle` → `x` (新しい名前を優先)
- 既存のクライアントコードはそのまま動作します

---

## エンドポイント一覧

### 1. Auth Trigger: `onUserCreate`

**種類**: Firebase Auth onCreate Trigger (自動実行)

**説明**: 新規ユーザー登録時に自動的に実行され、ユーザープロフィールと公開名刺を作成します。

**⚠️ 重要: 非同期実行**:
- この処理はFirebase Auth Triggerであり、**バックグラウンドで非同期に実行**されます
- ユーザー作成直後に `getPublicCard` を呼び出すと、`not-found` エラーが返される場合があります
- **推奨対応**: フロントエンドでリトライロジックを実装してください（例: 500ms待機後に再取得、最大3回まで）

**処理内容**:
- `/users/{userId}` に非公開プロフィールを作成
- `/cards/{userId}` に名刺データを作成（v0.7.0+: 旧 `/public_cards` から変更）

**displayName の生成ロジック**:
1. Firebase Auth の `user.displayName` が存在する場合（Google/Apple認証など）→ それを使用
2. `user.displayName` が null の場合（メール/パスワード認証）→ メールアドレスの @ の前を抽出し、サニタイズ処理を実行
   - 特殊文字（`+`, `.`, `-` など）を削除し、英数字（a-z, A-Z, 0-9）のみ保持
   - 例: `test@example.com` → `test`
   - 例: `user.name+tag@example.com` → `usernametag`
   - 例: `太郎.tanaka@example.jp` → `tanaka`
   - すべての文字が削除された場合 → `"user"` にフォールバック
3. メールアドレスも存在しない場合 → `"Anonymous"` にフォールバック

**サニタイゼーション理由**: 特殊文字を含む displayName は Firestore のセキュリティルールやクライアント側の表示で問題を引き起こす可能性があるため

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

// /cards/{userId} (v0.7.0+: Unified Card Model with flat structure)
{
  userId: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  theme: "default";
  visibility: {
    bio: "public",
    backgroundImageUrl: "public",
    badges: "public"
    // Other fields use defaults from constants/visibility.ts
  };
  updatedAt: Timestamp;
  // Note: SNS/contact fields not created initially, added when user updates them
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

**説明**: ユーザーが自分のプロフィール情報を更新します。`/users/{userId}` と `/cards/{userId}` の2箇所が更新されます（v0.7.0+: トランザクション不要、パフォーマンス向上）。

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

**更新対象** (v0.7.0+: Unified Card Model):
- `/users/{userId}`: `displayName`, `photoURL`, `updatedAt`
- `/cards/{userId}`: `displayName`, `bio`, `photoURL`, `updatedAt`

**注意事項**:
- 少なくとも1つのフィールド（`displayName`、`bio`、または `photoURL`）を指定する必要があります
- 未指定のフィールドは更新されません
- v0.7.0+: 統合カードモデルにより、トランザクション処理は不要になりました（パフォーマンス向上）

**変更点 (v0.7.0)**:
- `/cards` コレクションへの統合により、1箇所の更新で完結

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

**レスポンス** (v0.7.0+: Unified Card Model with flat structure):
```typescript
{
  success: true;
  publicCard: {
    userId: string;
    displayName: string;
    photoURL?: string;
    bio?: string;

    // SNS fields (public by default)
    github?: string;
    x?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    zenn?: string;
    qiita?: string;
    website?: string;
    blog?: string;
    youtube?: string;
    twitch?: string;

    // Display settings
    badges?: string[]; // v0.5.0+: showOnPublicCard=true のバッジIDリスト
    theme: string;
    customCss?: string;
    backgroundImageUrl?: string; // v0.6.0+: カード背景画像URL（Firebase Storage）

    updatedAt: string; // ISO 8601形式

    // Note: Private fields (email, phoneNumber, line, discord, telegram, slack, otherContacts)
    // are filtered out based on visibility settings
  }
}
```

**エラー**:
- `invalid-argument`: `userId` が不正な形式（空文字列、null、undefined等）
- `not-found`: 指定された公開名刺が存在しない場合
- `internal`: サーバー内部エラー

**参照データ** (v0.7.0+):
- `/cards/{userId}` から可視性が `"public"` のフィールドのみ取得

**注意事項**:
- 認証不要のため、公開URLから誰でもアクセス可能
- Webページ `https://devcard.com/{userId}` での利用を想定

---

### 6. Callable Function: `getSavedCards`

**エンドポイント**: `getSavedCards` (Callable Function)

**認証**: 必須

**説明**: 保存した名刺の一覧を、最新のマスターカード情報と共に取得します。PublicCardとPrivateCardの両方に対応し、統一された更新検知ロジック（hasUpdate）を提供します。

**⚠️ 破壊的変更 (v0.2.0)**: レスポンス構造が大幅に変更されました。

**⚠️ サインアップ直後の動作**:
- サインアップ直後（まだ1枚も名刺を保存していない場合）、`savedCards`は**空配列 `[]` を返します**
- これはエラーではなく、正常な動作です
- クライアント側は空配列を適切に処理する必要があります（例: "まだ名刺を保存していません"というメッセージを表示）

**リクエスト**:
```typescript
{
  cardType?: "public" | "private";  // フィルター (任意)
  eventId?: string;                 // イベントIDでフィルター (任意)
  limit?: number;                   // 取得件数 (任意、1-500、デフォルト20) ⚠️ v0.3.0で変更
  startAfter?: string;              // ページネーション: savedCardId (任意) ✨ v0.3.0で追加
}
```

**レスポンス** (v0.7.0+: Unified Card Model with flat structure):
```typescript
{
  success: true;
  savedCards: Array<{  // ⚠️ 空配列の場合あり（サインアップ直後など）
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

    // Master card details (visibility に応じてフィルタリング)
    displayName: string;
    photoURL?: string;
    updatedAt: string;                 // マスターカードのupdatedAt
    isDeleted?: boolean;               // マスターが削除済みの場合true

    // Basic profile fields
    bio?: string;
    theme?: string;
    customCss?: string;
    backgroundImageUrl?: string;
    badges?: string[];

    // SNS fields (public visibility: github, x, linkedin, instagram, facebook, zenn, qiita, website, blog, youtube, twitch)
    github?: string;
    x?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    zenn?: string;
    qiita?: string;
    website?: string;
    blog?: string;
    youtube?: string;
    twitch?: string;

    // Contact/messaging fields (private visibility: email, phoneNumber, line, discord, telegram, slack, otherContacts)
    // Only included if cardType='private' or if visibility is set to 'public' for specific fields
    email?: string;
    phoneNumber?: string;
    line?: string;
    discord?: string;
    telegram?: string;
    slack?: string;
    otherContacts?: string;
  }>
}
```

**レスポンス例（空の場合）**:
```json
{
  "success": true,
  "savedCards": []
}
```

**レスポンス例（データがある場合）**:
```json
{
  "success": true,
  "savedCards": [
    {
      "savedCardId": "abc123",
      "cardUserId": "user123",
      "cardType": "public",
      "savedAt": "2025-01-15T10:30:00Z",
      "hasUpdate": false,
      "displayName": "山田太郎",
      "photoURL": "https://example.com/photo.jpg",
      "updatedAt": "2025-01-15T10:00:00Z",
      "bio": "Software Engineer"
    }
  ]
}
```

**更新検知ロジック**:
```typescript
hasUpdate = !lastKnownUpdatedAt || lastKnownUpdatedAt < master.updatedAt
```
- `lastKnownUpdatedAt`が未設定（初回）の場合: `hasUpdate = true`
- `lastKnownUpdatedAt < master.updatedAt`の場合: `hasUpdate = true` (更新あり)
- `lastKnownUpdatedAt == master.updatedAt`の場合: `hasUpdate = false` (閲覧済み・最新)

**エラー**:
- `unauthenticated`: 認証されていない場合
- `invalid-argument`: 以下の場合
  - `cardType` が "public" または "private" 以外
  - `limit` が1未満または500超
  - `startAfter` が文字列以外の型 (v0.3.0)
- `internal`: サーバー内部エラー

**💡 重要**: 空の`saved_cards`サブコレクションへのクエリは**エラーにならず**、空配列を返します。クライアント側では`savedCards.length`をチェックしてから配列要素にアクセスしてください。

**ページネーション (v0.3.0) ✨**:
- `startAfter`: 前回取得した最後のカードの `savedCardId` を指定
- 無限スクロール実装例:
  ```typescript
  // 初回取得
  const first = await getSavedCards({ limit: 20 });

  // 次のページ取得
  const lastCard = first.savedCards[first.savedCards.length - 1];
  const next = await getSavedCards({
    limit: 20,
    startAfter: lastCard.savedCardId
  });
  ```

**注意事項**:
- SavedCardはスナップショットではなく、**常に最新のマスターカードを参照**します
- 相手がGitHub同期やプロフィール変更をすると、即座に反映されます
- `hasUpdate=true` の場合、「最新版があります！」バッジを表示することを推奨
- 名刺詳細を表示したら `markAsViewed` を呼び出して `hasUpdate` をfalseにしてください
- `isDeleted=true` の場合、マスターカードが削除済みです（「この名刺は削除されました」と表示を推奨）
- **v0.3.0変更**: デフォルト `limit` が 100 → 20 に変更。必要に応じて明示的に `limit: 100` を指定してください

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

**処理フロー** (v0.7.0+: Unified Card Model):
1. 認証済みユーザーのIDを取得
2. `/users/{userId}` から各サービスのアクセストークンを取得
3. 外部API（GitHub等）を呼び出して最新情報を取得
4. `/cards/{userId}` の対応するフィールド（`github` など）を更新

**更新されるデータ（GitHub の場合）** (v0.7.0+):
```typescript
// /cards/{userId} に以下のフィールドを更新
{
  github: string;  // GitHubユーザー名
  updatedAt: Timestamp;
}
```

**注意事項**:
- 認可: 自分自身のデータのみ同期可能（UserIDはリクエストから受け取らず、認証済みユーザーのIDを使用）
- 部分成功: 一部のサービス同期が失敗しても、成功したものは反映される
- トークン保護: アクセストークンはログに出力されない

**変更点 (v0.7.0)**:
- フラット構造: GitHubユーザー名が `/cards/{userId}` の `github` フィールドに保存されます
- `connectedServices` オブジェクトは使用されなくなりました

**変更点 (v0.2.0)**:
- **同期成功時のみ `Card.updatedAt` を更新**（エラー時は更新しない）
- これにより、保存済み名刺の更新検知（`hasUpdate`）が正しく機能します

---

### 8. Callable Function: `updatePrivateCard`

**エンドポイント**: `updatePrivateCard` (Callable Function)

**認証**: 必須（自分のPrivateCardのみ編集可能）

**説明**: 個人連絡先情報を作成・更新します。v0.7.0+: `/cards/{userId}` のフラットフィールドとして保存され、初回呼び出し時にフィールドが追加され、2回目以降は部分更新されます。

**リクエスト** (v0.7.0+: 新旧フィールド名両方サポート):
```typescript
{
  // Contact fields
  email?: string;           // メールアドレス (任意、最大255文字、email形式)
  phoneNumber?: string;     // 電話番号 (任意、最大50文字)

  // Messaging fields (新しい名前を優先、旧名も後方互換性のためサポート)
  line?: string;            // LINE ID (任意、最大100文字) - 推奨
  lineId?: string;          // ⚠️ 非推奨: 後方互換性のため残されています。代わりに `line` を使用してください

  discord?: string;         // Discord ID (任意、最大100文字) - 推奨
  discordId?: string;       // ⚠️ 非推奨: 後方互換性のため残されています。代わりに `discord` を使用してください

  x?: string;               // X/Twitterハンドル (任意、最大15文字) - 推奨
  twitterHandle?: string;   // ⚠️ 非推奨: 後方互換性のため残されています。代わりに `x` を使用してください

  telegram?: string;        // Telegram ID (任意、最大100文字) ✨ v0.7.0+
  slack?: string;           // Slack ID (任意、最大100文字) ✨ v0.7.0+

  // Other
  otherContacts?: string;   // その他連絡先 (任意、最大500文字)
}
```

**バリデーション**:
- 少なくとも1つのフィールドが必須
- `email`: 有効なメールアドレス形式、255文字以下
- `phoneNumber`: 50文字以下
- `line` / `lineId`: 100文字以下
- `discord` / `discordId`: 100文字以下
- `telegram`, `slack`: 100文字以下
- `x` / `twitterHandle`:
  - 1-15文字（@を除く）
  - 英数字とアンダースコアのみ
  - 入力時に`@`付きでも可（例: `@username` または `username`）
  - 保存時は`@`なしで正規化（例: `username`）
  - 表示時はフロントエンドで`@`を追加推奨（例: `@username`）
  - **空文字列 `""` を送信するとフィールドが削除されます**（v0.7.0）
- `otherContacts`: 500文字以下

**後方互換性**:
- 新旧両方のフィールド名を送信した場合、新しい名前（`line`, `discord`, `x`）が優先されます
- 例: `{ line: "abc", lineId: "xyz" }` → `line: "abc"` が使用されます

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

**保存先** (v0.7.0+): `/cards/{userId}` - フラットフィールドとして保存

**注意事項**:
- v0.7.0+: フラット構造で `/cards/{userId}` に直接保存されます（ネストされた `privateContacts` オブジェクトは使用しません）
- 初回呼び出し時: 既存のCardにフィールドを追加
- 2回目以降: 指定されたフィールドのみ部分更新（未指定フィールドは保持）
- `displayName`, `photoURL` は `updateProfile` で更新されると自動同期されます
- 何か一つでも変更されたら `updatedAt` が必ず更新されます
- **v0.7.0 変更**: `x` に空文字列 `""` を送信すると、Firestoreから該当フィールドが削除されます（`undefined` として扱われる）
- 可視性制御: デフォルトでは連絡先/メッセージングフィールドは `"private"` として扱われます

---

### 9. Callable Function: `getPrivateCard`

**エンドポイント**: `getPrivateCard` (Callable Function)

**認証**: 必須（自分のPrivateCardのみ取得可能）

**説明**: 自分の個人連絡先情報を取得します。v0.7.0+: `/cards/{userId}` から可視性が `"private"` のフィールドを含むすべてのデータを取得します。他人のCardは取得できません。

**リクエスト**: なし

**レスポンス** (v0.7.0+: フラット構造):
```typescript
{
  userId: string;
  displayName: string;
  photoURL?: string;
  bio?: string;

  // Contact fields (private by default)
  email?: string;
  phoneNumber?: string;

  // Messaging fields (private by default)
  line?: string;
  discord?: string;
  telegram?: string;
  slack?: string;

  // SNS fields (public by default, but included in private view)
  github?: string;
  x?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  zenn?: string;
  qiita?: string;
  website?: string;
  blog?: string;
  youtube?: string;
  twitch?: string;

  // Other
  otherContacts?: string;
  badges?: string[];  // v0.5.0+: showOnPrivateCard=true のバッジIDリスト

  updatedAt: string;  // ISO 8601形式
} | null  // プライベートフィールドが未設定の場合null
```

**エラー**:
- `unauthenticated`: 認証されていない場合
- `internal`: サーバー内部エラー

**注意事項** (v0.7.0+):
- プライベートフィールド（`email`, `phoneNumber`, `line`, `discord`, `telegram`, `slack`, `otherContacts`）がすべて未設定の場合は `null` を返します
- フラット構造: すべてのフィールドがルートレベルで返されます（ネストされた `privateContacts` オブジェクトはありません）
- セキュリティ: 他人のCardは絶対に取得できません（認証済みユーザーIDのみ使用）
- 可視性フィルタリング: `visibility="private"` として処理され、すべてのフィールド（public/private）が含まれます

---

### 10. Callable Function: `createExchangeToken` ✨ v0.3.0

**エンドポイント**: `createExchangeToken` (Callable Function)

**認証**: 必須

**説明**: 自分の連絡先情報（プライベートフィールド）を交換するための一時トークンを生成します。v0.7.0+: フラット構造の `/cards/{userId}` から生成します。生成されたトークンをQRコード化し、相手に読み取ってもらうことで連絡先交換を実現します。

**リクエスト**: なし（認証済みユーザーの `/cards/{userId}` から自動生成）

**レスポンス**:
```typescript
{
  success: true;
  tokenId: string;        // ランダム生成されたトークンID (20文字、Base64URL: [A-Za-z0-9_-])
  expiresAt: string;      // トークン有効期限 (ISO 8601形式、生成から1分後)
  qrCodeData: string;     // QRコード用データ "devcard://exchange/{tokenId}"
}
```

**トークンの仕様**:
- **有効期限**: 生成から1分間
- **使用回数**: 1回のみ（誰かが `savePrivateCard` で使用すると無効化）
- **保存先**: `/exchange_tokens/{tokenId}` コレクション
- **文字セット**: Base64URL形式 `[A-Za-z0-9_-]`（URL安全、QRコード互換）
- **セキュリティ**: `crypto.randomBytes()` による暗号学的に安全な乱数生成（120ビットのエントロピー、衝突確率 ~2^-120）

**エラー**:
- `unauthenticated`: 認証されていない場合
- `not-found`: プライベートフィールドが未設定の場合（先に `updatePrivateCard` を呼び出す必要あり）
- `internal`: サーバー内部エラー

**使用フロー例**:
```typescript
// 1. PrivateCard交換トークン生成
const token = await createExchangeToken({});
console.log(token.qrCodeData); // "devcard://exchange/abc-_123XYZ..."

// 2. QRコードを生成して表示
<QRCode value={token.qrCodeData} />

// 3. 相手がQRコードをスキャンして savePrivateCard を実行
// （相手側の処理）
await savePrivateCard({ tokenId: "abc-_123XYZ..." });
```

**注意事項** (v0.7.0+):
- プライベートフィールドが未設定の場合はエラーになります。先に `updatePrivateCard` で作成してください
- `/cards/{userId}` にプライベートフィールド（`email`, `phoneNumber`, `line`, `discord`, `telegram`, `slack`, `otherContacts`）が少なくとも1つ必要です
- トークンは1分間で自動的に期限切れになります
- トークンは1回使用されると無効化されます
- 自分のトークンを自分で使用することはできません（`savePrivateCard` でエラー）
- **v0.7.0 セキュリティ強化**: トークンIDが `Math.random()` から `crypto.randomBytes()` に変更され、推測攻撃に対して安全になりました
- **v0.8.0 トークンリフレッシュ (Issue #50)**: 新しいトークンを生成すると、同一ユーザーの既存の未使用トークンは自動的に削除されます。これにより、ユーザーが保持できる有効な交換トークンは常に1つのみとなり、セキュリティが向上します。使用済みトークンは削除されません。

**QRコード実装推奨**:
- `qrCodeData` の値をそのままQRコードライブラリに渡してください
- QRコード読み取り後、カスタムURLスキーム `devcard://exchange/{tokenId}` をハンドリングし、`savePrivateCard` を呼び出してください

---

### 11. Callable Function: `savePrivateCard`

**エンドポイント**: `savePrivateCard` (Callable Function)

**認証**: 必須

**説明**: トークンを使用して、他のユーザーの連絡先情報（プライベートフィールド）を保存します。v0.7.0+: フラット構造の `/cards/{userId}` から情報を取得します。トークンは1分間有効で、1回のみ使用可能です。

**リクエスト**:
```typescript
{
  tokenId: string;  // 交換トークンID (必須、20文字、Base64URL形式)
}
```

**バリデーション**:
- `tokenId`: 必須、20文字、Base64URL形式 `[A-Za-z0-9_-]`

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
  - `tokenId` が Base64URL形式でない（無効な文字 `=`, `+` など）
  - `tokenId` の長さが20文字でない（19文字以下または21文字以上）
  - トークンの所有者が自分自身（自分のトークンは使用不可）
  - トークンが期限切れ（作成から1分超過）
  - トークンが使用済み
- `not-found`: トークンが存在しない、またはCardが存在しない
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
  lastKnownUpdatedAt: Timestamp; // 相手のCard.updatedAt
}
```

**注意事項** (v0.7.0+):
- トークンは `/exchange_tokens/{tokenId}` に保存されています（将来的にQRコード/AirDropでの交換を想定）
- 使用後、トークンは `usedBy`, `usedAt` フィールドでマークされ、再利用不可になります
- セキュリティ: 自分のトークンは使用できません
- v0.7.0+: `/cards/{userId}` から直接情報を取得します（フラット構造）
- **v0.8.0 期限切れトークン即時削除 (Issue #50)**: 期限切れトークンを使用しようとした場合、トークンは即座にFirestoreから削除されます。エラーレスポンスは従来通り `invalid-argument` ですが、トークンは削除されるため、再度同じトークンで試行しても `not-found` エラーとなります。

---

### 12. Callable Function: `markAsViewed`

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

### 13. Callable Function: `deleteSavedCard`

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
- 削除されるのはSavedCardのみ（マスターのCardは削除されません）

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

### ConnectedService (⚠️ 非推奨: v0.7.0+)

**注意**: v0.7.0以降、`connectedServices` オブジェクトは使用されなくなりました。代わりに、フラット構造の SNS フィールド（`github`, `x`, `linkedin` など）を使用してください。

```typescript
// ⚠️ 非推奨: v0.7.0以降は使用されません
interface ConnectedService {
  serviceName: string;  // "github", "qiita", "zenn", "x"
  username: string;
  profileUrl: string;
  avatarUrl?: string;
  bio?: string;
  stats?: Record<string, number | string>; // サービス固有の統計情報
}
```

**v0.7.0+ フラット構造**:
```typescript
// 新しい構造: SNSフィールドは直接Cardオブジェクトに保存
interface Card {
  // ... 他のフィールド
  github?: string;      // GitHubユーザー名
  x?: string;           // X/Twitterハンドル
  linkedin?: string;    // LinkedInプロフィールURL
  instagram?: string;
  facebook?: string;
  zenn?: string;
  qiita?: string;
  website?: string;
  blog?: string;
  youtube?: string;
  twitch?: string;
}
```

---

## 11. モデレーター追加: `addModerator`

**種類**: Callable Function (Admin専用)

**説明**: 管理者がモデレーターまたは新しい管理者を追加します。

**権限**: Adminのみ（Custom Claims: `admin: true`）

**リクエスト**:
```typescript
{
  userId: string;          // モデレーターに昇格させるユーザーID
  role: "admin" | "moderator"; // ロール
  permissions: string[];   // 権限リスト（例: ["badge:create", "badge:grant"]）
}
```

**レスポンス**:
```typescript
{
  success: true;
  moderator: {
    userId: string;
    role: "admin" | "moderator";
    permissions: string[];
    createdAt: string; // ISO 8601形式
  };
}
```

**エラー**:
- `unauthenticated`: 未認証
- `permission-denied`: Admin権限がない
- `invalid-argument`: 入力パラメータが不正
- `not-found`: 指定されたユーザーが存在しない
- `internal`: サーバーエラー

---

## 12. バッジ作成: `createBadge`

**種類**: Callable Function (Moderator/Admin専用)

**説明**: モデレーターまたは管理者が新しいバッジを作成します。

**権限**: ModeratorまたはAdmin（Custom Claims: `moderator: true` または `admin: true`）

**リクエスト**:
```typescript
{
  name: string;              // バッジ名（1-50文字）
  description: string;       // 説明（1-500文字）
  iconUrl?: string;          // アイコンURL（HTTPS）
  color?: string;            // カラーコード（例: "#FFD700"）
  priority: number;          // 表示優先度（0以上、小さいほど優先）
  isActive: boolean;         // アクティブフラグ
}
```

**レスポンス**:
```typescript
{
  success: true;
  badge: {
    badgeId: string;
    name: string;
    description: string;
    iconUrl?: string;
    color?: string;
    priority: number;
    isActive: boolean;
    createdAt: string;       // ISO 8601形式
    createdBy: string;       // 作成者のuserId
  };
}
```

**エラー**:
- `unauthenticated`: 未認証
- `permission-denied`: Moderator/Admin権限がない
- `invalid-argument`: 入力パラメータが不正
- `internal`: サーバーエラー

---

## 13. バッジ一覧取得: `listBadges`

**種類**: Callable Function (公開)

**説明**: すべてのアクティブなバッジを取得します。

**権限**: なし（公開エンドポイント）

**リクエスト**: なし

**レスポンス**:
```typescript
{
  success: true;
  badges: Array<{
    badgeId: string;
    name: string;
    description: string;
    iconUrl?: string;
    color?: string;
    priority: number;
    createdAt: string;       // ISO 8601形式
  }>;
}
```

**エラー**:
- `internal`: サーバーエラー

---

## 14. バッジ付与: `grantBadge`

**種類**: Callable Function (Moderator/Admin専用)

**説明**: モデレーターまたは管理者がユーザーにバッジを付与します。

**権限**: ModeratorまたはAdmin（Custom Claims: `moderator: true` または `admin: true`）

**リクエスト**:
```typescript
{
  badgeId: string;           // 付与するバッジID
  targetUserId: string;      // 付与先ユーザーID
  reason?: string;           // 付与理由（任意）
}
```

**レスポンス**:
```typescript
{
  success: true;
  userBadge: {
    badgeId: string;
    grantedAt: string;       // ISO 8601形式
    grantedBy: string;       // 付与者のuserId
    reason?: string;
    visibility: {
      showOnPublicCard: boolean;   // デフォルト: true
      showOnPrivateCard: boolean;  // デフォルト: true
    };
  };
}
```

**エラー**:
- `unauthenticated`: 未認証
- `permission-denied`: Moderator/Admin権限がない
- `invalid-argument`: 入力パラメータが不正
- `not-found`: バッジまたはユーザーが存在しない
- `already-exists`: 既に付与済み
- `internal`: サーバーエラー

---

## 15. バッジ剥奪: `revokeBadge`

**種類**: Callable Function (Moderator/Admin専用)

**説明**: モデレーターまたは管理者がユーザーからバッジを剥奪します。

**権限**: ModeratorまたはAdmin（Custom Claims: `moderator: true` または `admin: true`）

**リクエスト**:
```typescript
{
  badgeId: string;           // 剥奪するバッジID
  targetUserId: string;      // 剥奪対象ユーザーID
}
```

**レスポンス**:
```typescript
{
  success: true;
}
```

**エラー**:
- `unauthenticated`: 未認証
- `permission-denied`: Moderator/Admin権限がない
- `invalid-argument`: 入力パラメータが不正
- `not-found`: バッジまたはユーザーが存在しない
- `internal`: サーバーエラー

---

## データモデル

### Badge（バッジ）

```typescript
{
  badgeId: string;
  name: string;              // 1-50文字
  description: string;       // 1-500文字
  iconUrl?: string;          // HTTPS URL
  color?: string;            // カラーコード
  priority: number;          // 表示優先度（0以上）
  isActive: boolean;         // アクティブフラグ
  createdAt: Timestamp;
  createdBy: string;         // 作成者のuserId
}
```

Firestoreパス: `/badges/{badgeId}`

### UserBadge（ユーザーバッジ）

```typescript
{
  badgeId: string;
  grantedAt: Timestamp;
  grantedBy: string;         // 付与者のuserId
  reason?: string;           // 付与理由
  visibility: {
    showOnPublicCard: boolean;   // デフォルト: true
    showOnPrivateCard: boolean;  // デフォルト: true
  };
}
```

Firestoreパス: `/users/{userId}/badges/{badgeId}`

### Moderator（モデレーター）

```typescript
{
  userId: string;
  role: "admin" | "moderator";
  permissions: string[];     // 例: ["badge:create", "badge:grant"]
  createdAt: Timestamp;
}
```

Firestoreパス: `/moderators/{userId}`

**Custom Claims**: モデレーター権限はFirebase AuthのCustom Claimsで管理
```typescript
{
  moderator: boolean;        // モデレーターまたはAdminの場合true
  admin: boolean;            // Adminの場合true
}
```

---

## 16. バッジ表示設定更新: `updateBadgeVisibility`

**種類**: Callable Function (認証必須)

**説明**: ユーザーが自分のバッジをPublicCard/PrivateCardに表示するか個別に設定します。

**権限**: 認証必須（自分のバッジのみ変更可能）

**リクエスト**:
```typescript
{
  badgeId: string;              // バッジID
  showOnPublicCard: boolean;    // PublicCardに表示するか
  showOnPrivateCard: boolean;   // PrivateCardに表示するか
}
```

**レスポンス**:
```typescript
{
  success: true;
}
```

**エラー**:
- `unauthenticated`: 未認証
- `invalid-argument`: 入力パラメータが不正
- `not-found`: ユーザーが指定されたバッジを所持していない
- `internal`: サーバーエラー

---

## 17. ユーザーバッジ取得: `getUserBadges`

**種類**: Callable Function (公開)

**説明**: 指定ユーザーの所持バッジ一覧を取得します。

**権限**: なし（公開エンドポイント）

**リクエスト**:
```typescript
{
  userId: string;  // バッジを取得するユーザーID
}
```

**レスポンス**:
```typescript
{
  success: true;
  badges: Array<{
    badgeId: string;
    grantedAt: string;        // ISO 8601形式
    grantedBy: string;        // 付与者のuserId
    reason?: string;          // 付与理由（任意）
    visibility: {
      showOnPublicCard: boolean;
      showOnPrivateCard: boolean;
    };
  }>;
}
```

**エラー**:
- `invalid-argument`: 入力パラメータが不正
- `internal`: サーバーエラー

---

## 既存APIの拡張 (Phase 2)

### getPublicCard の拡張

**追加フィールド**:
```typescript
{
  // ... 既存フィールド
  badges?: string[];  // showOnPublicCard=true のバッジIDリスト
}
```

- `showOnPublicCard=true` のバッジのみ含まれる
- バッジがない場合は `undefined` または未定義

### getPrivateCard の拡張

**追加フィールド**:
```typescript
{
  // ... 既存フィールド
  badges?: string[];  // showOnPrivateCard=true のバッジIDリスト
}
```

- `showOnPrivateCard=true` のバッジのみ含まれる
- バッジがない場合は `undefined` または未定義

### getSavedCards の拡張 (今後対応予定)

各保存されたカード情報に `badges?: string[]` フィールドが追加される予定です。

---

## 18. Image Upload API: `uploadProfileImage`

**エンドポイント**: `uploadProfileImage` (Callable Function)

**認証**: 必須

**説明**: プロフィール画像をFirebase Storageにアップロードし、`/users`, `/cards` の `photoURL` を更新します。v0.7.0+: 統合カードモデルにより、更新箇所が簡素化されました。

**リクエスト**:
```typescript
{
  imageData: string;    // Base64エンコードされた画像データ
  contentType: string;  // "image/jpeg" | "image/png" | "image/webp"
}
```

**バリデーション**:
- `imageData`: 必須、非空文字列、Base64形式（Data URL形式 `data:image/...;base64,...` または純粋なBase64）
- `contentType`: 必須、`image/jpeg`, `image/png`, `image/webp` のいずれか
- ファイルサイズ: 5MB以内（Handler層で検証）

**レスポンス**:
```typescript
{
  success: true;
  photoURL: string;  // Firebase Storage公開URL
}
```

**エラー**:
- `unauthenticated`: 認証されていない
- `invalid-argument`:
  - `imageData` または `contentType` が不正
  - ファイルサイズが5MBを超える
  - Content-Typeが許可リストに含まれない
- `not-found`: ユーザーまたは Card が存在しない
- `internal`: アップロード失敗

**保存先**: `/user_images/{userId}/profile.{ext}` (Firebase Storage)

**更新対象** (v0.7.0+: Unified Card Model):
- `/users/{userId}` の `photoURL`
- `/cards/{userId}` の `photoURL`

**セキュリティ**:
- 本人のみアップロード可能（`request.auth.uid == userId`）
- Storage Rulesでサイズ・Content-Type検証を二重実施

---

## 19. Image Upload API: `uploadCardBackground`

**エンドポイント**: `uploadCardBackground` (Callable Function)

**認証**: 必須

**説明**: カード背景画像をFirebase Storageにアップロードし、`/cards/{userId}` の `backgroundImageUrl` を更新します。v0.7.0+: 統合カードモデルに対応。

**リクエスト**:
```typescript
{
  imageData: string;    // Base64エンコードされた画像データ
  contentType: string;  // "image/jpeg" | "image/png" | "image/webp"
}
```

**バリデーション**:
- `imageData`: 必須、非空文字列、Base64形式
- `contentType`: 必須、`image/jpeg`, `image/png`, `image/webp` のいずれか
- ファイルサイズ: 5MB以内

**レスポンス**:
```typescript
{
  success: true;
  backgroundImageUrl: string;  // Firebase Storage公開URL
}
```

**エラー**:
- `unauthenticated`: 認証されていない
- `invalid-argument`:
  - `imageData` または `contentType` が不正
  - ファイルサイズが5MBを超える
  - Content-Typeが許可リストに含まれない
- `not-found`: Card が存在しない
- `internal`: アップロード失敗

**保存先**: `/user_images/{userId}/card_background.{ext}` (Firebase Storage)

**更新対象** (v0.7.0+: Unified Card Model):
- `/cards/{userId}` の `backgroundImageUrl`

**セキュリティ**:
- 本人のみアップロード可能
- 画像は公開読み取り可能（可視性設定に基づく）

---

## 備考

- バージョン: **v0.6.0** (画像アップロード機能 - Profile & Card Background)
- この契約は段階的に拡張されます
- 変更履歴は `CHANGELOG.md` を参照してください
- 機械可読な仕様は `openapi.yaml` に記載されます（将来的に）

