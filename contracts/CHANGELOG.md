# Changelog

このファイルは、API仕様の変更履歴を記録します。
フロントエンド・iOSチームに変更を伝える際の差分の根拠となります。

このCHANGELOGは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に準拠します。

---

## [Unreleased]

---

## [0.7.0] - 2025-10-28

### 🔄 Internal Refactoring - Unified Card Model (Issue #68)

**重要**: これは**内部実装の変更**であり、**APIインターフェースに破壊的変更はありません**。
すべての既存クライアントコードはそのまま動作します。

### Changed
- **データモデルの統合**:
  - `/public_cards` と `/private_cards` コレクションを単一の `/cards` コレクションに統合
  - **フラット構造**: すべてのフィールド（公開/非公開）をルートレベルで管理（email, phoneNumber, line, discord, x, github, linkedin等）
  - デフォルト可視性: 連絡先/メッセージングフィールド='private'、SNSフィールド='public'
  - 可視性設定を `/cards/{userId}.visibility` で管理（将来の機能拡張用）

- **パフォーマンス向上**:
  - `updateProfile`: トランザクション処理が不要になり、レスポンスタイムが改善
  - `/users` と `/cards` の2箇所のみ更新（旧: `/users`, `/public_cards`, `/private_cards` の3箇所）

- **Auth Trigger `onUserCreate`**:
  - `/cards/{userId}` を作成（旧: `/public_cards/{userId}`）
  - `visibility` フィールドを初期化（すべて `"public"` に設定）

### Technical Details
- **Domain Layer**:
  - 新規: `Card` (フラット構造), `VisibilityLevel`, `ICardRepository`, `CardVisibilityFilter`
  - 新規: `/constants/visibility.ts` でデフォルト可視性ルールを定義
  - 削除: `PublicCard`, `IPublicCardRepository`, `PrivateCard`, `IPrivateCardRepository`

- **Infrastructure Layer**:
  - 新規: `CardRepository` (`/cards` コレクション管理、フラットフィールド対応)

- **Application Layer**:
  - `UpdateProfileUseCase`: トランザクション処理を削除、`CardRepository` を使用
  - `UploadProfileImageUseCase`: `CardRepository` を使用
  - `UploadCardBackgroundUseCase`: `CardRepository` を使用
  - `SavePrivateCardUseCase`: `ICardRepository` を使用
  - `CreateExchangeTokenUseCase`: `ICardRepository` を使用

- **Handler Layer**:
  - すべてのハンドラーで `CardRepository` を使用
  - フィールド名の後方互換性: `lineId`/`line`, `discordId`/`discord`, `twitterHandle`/`x` 両方を受付（新名優先）
  - レスポンスはフラット構造で返却

- **Tests**:
  - ユニットテスト: 83件すべて成功
  - 統合テスト: 144件すべて成功
  - 統合テストヘルパーを更新（`createTestUser` が `/cards` を作成）

### Security
- Firestore Security Rules: `/cards` コレクションに対する読み取り/書き込みルールを追加
- 可視性フィルタリングはバックエンド側（Application層）で実施
- 既存のセキュリティポリシー（認証、認可）に変更なし

### Migration
- 既存データは現時点では移行不要（旧コレクションと新コレクションが共存可能）
- マイグレーションスクリプト用意: `functions/src/scripts/migrateToUnifiedCard.ts`
- 本番環境への適用は別途計画

### Backward Compatibility
- ✅ すべての既存APIエンドポイントが正常動作
- ✅ 旧フィールド名（`lineId`, `discordId`, `twitterHandle`）も引き続き受付可能
- ✅ レスポンスはフラット構造だが、既存フィールド名で互換性維持
- ✅ クライアント側の実装変更は不要

---

## [0.8.0] - 2025-10-27

### Changed
- **Exchange Token Lifecycle Management (Issue #50)**
  - **`createExchangeToken` 動作変更**:
    - 新しいトークンを生成する際、同一ユーザーの既存の**未使用**トークンが自動的に削除されるようになりました
    - 使用済みトークン（`usedBy`が設定済み）は削除されません
    - これにより、ユーザーが保持できる有効な交換トークンは常に1つのみになります
    - **非破壊的変更**: APIレスポンス構造は変更なし
  - **`savePrivateCard` 動作変更**:
    - 期限切れトークンを使用しようとした場合、トークンが即座にFirestoreから削除されます
    - エラーレスポンスは従来通り `invalid-argument` (Token has expired)
    - 削除されたトークンで再度試行すると `not-found` (Token not found) エラーとなります
    - **非破壊的変更**: APIレスポンス構造は変更なし

### Technical
- Domain層: `IExchangeTokenRepository` に2つのメソッド追加
  - `delete(tokenId: string)`: 単一トークン削除
  - `deleteUnusedByOwnerId(ownerId: string)`: 未使用トークン一括削除
- Infrastructure層: `ExchangeTokenRepository` に実装追加
- Application層: `SavePrivateCardUseCase` と `CreateExchangeTokenUseCase` の修正
- 統合テスト: 5件追加 (期限切れ削除 2件、リフレッシュ 3件、境界条件 1件)
- ユニットテスト: 6件追加 (Repository 3件、UseCase 3件)

### Security
- トークンリフレッシュ: 1ユーザー1有効トークンに制限し、古いトークンからの不正アクセスリスクを排除
- 即時削除: 期限切れトークンは検証時に即座に削除され、無効なトークンがFirestoreに残らない
- ストレージコスト削減: 不要なトークンが自動的に削除され、Firestoreの肥大化を防止

### Migration Guide
**クライアント側の実装変更は不要です。**

動作の変更点:
1. ユーザーが複数のデバイスで同時にQRコードを生成した場合、後から生成した方のみ有効になります
   - 実用上問題なし（QRコード交換は1対1で行われるため）
2. 期限切れトークンを使用した際、再試行しても `not-found` エラーになります
   - クライアント側でリトライロジックを実装している場合、`invalid-argument` と `not-found` の両方を処理してください

### Breaking Changes
**なし** - APIレスポンス構造は変更されていません。

---

## [0.7.0] - 2025-10-27

### Security
- **🔴 CRITICAL: Exchange Token Security Fix** (Issue #31)
  - **修正内容**: `createExchangeToken` のトークンID生成を `Math.random()` から `crypto.randomBytes()` に変更
  - **影響**: `Math.random()` は暗号学的に安全ではなく、攻撃者がトークンIDを推測してプライベート名刺に不正アクセスできる脆弱性があった
  - **対策**: `crypto.randomBytes(15)` で120ビットのエントロピーを生成（衝突確率: ~2^-120）
  - **文字セット変更**: `[A-Za-z0-9]` → `[A-Za-z0-9_-]` (Base64URL形式)
  - **非破壊的変更**: クライアント側は tokenId を不透明な文字列として扱うため影響なし

### Changed
- **`createExchangeToken` API 仕様変更**
  - トークンIDが Base64URL形式 `[A-Za-z0-9_-]` に変更（`-` と `_` を含む可能性）
  - トークンの長さは20文字で変更なし
  - セキュリティ: `crypto.randomBytes()` による CSPRNG（暗号学的に安全な擬似乱数生成器）
- **`savePrivateCard` バリデーション強化**
  - `tokenId` パラメータで Base64URL形式を検証（`[A-Za-z0-9_-]{20}`）
  - 無効な文字（`=`, `+` など）を含む tokenId は `invalid-argument` エラー
  - 長さが20文字でない tokenId は `invalid-argument` エラー
- **`updatePrivateCard` の `twitterHandle` 空文字列処理変更**
  - `twitterHandle: ""` を送信すると、Firestore から該当フィールドが削除される（`undefined` として扱われる）
  - 変更前: 空文字列 `""` が Firestore に保存されていた
  - 変更後: 空文字列を送信すると `FieldValue.delete()` で削除される
  - **軽微な破壊的変更**: クライアントが `twitterHandle === ""` でチェックしている場合、`=== undefined` または `!twitterHandle` に変更が必要

### Migration Guide

#### 1. トークンIDの文字セット拡張（非破壊的）

クライアント側で tokenId を不透明文字列として扱っている場合、変更不要。

QRコード読み取り時に `-` と `_` を含む tokenId を正しく処理できることを確認：

```typescript
// 変更前の例: "devcard://exchange/aBcD1234XyZ567890123"
// 変更後の例: "devcard://exchange/aBcD-_34XyZ567890123"

// URL解析は既存のパーサーで対応可能
const url = new URL("devcard://exchange/abc-_123XYZ...");
const tokenId = url.pathname.split('/')[1]; // "abc-_123XYZ..."
```

#### 2. twitterHandle の空文字列処理（軽微な破壊的変更）

**変更内容**:
- `updatePrivateCard({ twitterHandle: "" })` を呼び出すと、Firestore に `""` が保存される代わりに、フィールドが削除されます

**影響**:
- `privateCard.twitterHandle === ""` でチェックしている場合、動作が変わります

**対応方法**:
```typescript
// 変更前
if (privateCard.twitterHandle === "") {
  // X アカウント未登録
}

// 変更後（推奨）
if (!privateCard.twitterHandle) {
  // X アカウント未登録（undefined または空文字列）
}

// または
if (privateCard.twitterHandle === undefined) {
  // X アカウント未登録
}
```

**削除方法**（変更前後で同じ操作）:
```typescript
// X アカウントを削除する場合
await updatePrivateCard({ twitterHandle: "" });

// 変更前の結果: privateCard.twitterHandle === ""
// 変更後の結果: privateCard.twitterHandle === undefined
```

### Technical
- CreateExchangeTokenUseCase: `crypto.randomBytes()` 導入
- PrivateCardRepository: 空文字列を `FieldValue.delete()` に変換するロジック追加
- savedCardHandlers: tokenId の Base64URL バリデーション追加
- 統合テスト: Base64URL tokenId のテストケース追加（3件）
- 単体テスト: トークンID生成の形式・一意性テスト追加（2件）

### Breaking Changes
- **軽微な破壊的変更**: `updatePrivateCard` の `twitterHandle` で空文字列を送信した場合の動作変更
  - クライアント側で `twitterHandle === ""` チェックを `!twitterHandle` に変更する必要がある場合があります
  - 既存データ: `twitterHandle: ""` が保存されているデータは残りますが、次回更新時に削除されます

### Non-Breaking Changes
- `createExchangeToken` のトークンID文字セット拡張（クライアントへの影響なし）
- `savePrivateCard` のバリデーション強化（セキュリティ向上）

---

## [0.6.0] - 2025-10-27

### Added
- **Image Upload Feature** (Issue #MVP-ImageUpload)
  - **Callable Function: `uploadProfileImage`** (認証必須)
    - プロフィール画像をFirebase Storageにアップロード
    - `/users`, `/public_cards`, `/private_cards` (存在する場合) の `photoURL` を更新
    - パラメータ: `{imageData: string (Base64), contentType: string}`
    - レスポンス: `{success: true, photoURL: string}`
    - 対応形式: JPEG, PNG, WebP
    - サイズ制限: 5MB以内
  - **Callable Function: `uploadCardBackground`** (認証必須)
    - カード背景画像をFirebase Storageにアップロード
    - `/public_cards` の `backgroundImageUrl` を更新
    - パラメータ: `{imageData: string (Base64), contentType: string}`
    - レスポンス: `{success: true, backgroundImageUrl: string}`
    - 対応形式: JPEG, PNG, WebP
    - サイズ制限: 5MB以内

### Changed
- **`getPublicCard` API拡張**
  - レスポンスに `backgroundImageUrl?: string` フィールド追加
  - `uploadCardBackground` でアップロードした背景画像URLを返却
- **Domain Model拡張**
  - `PublicCard` インターフェースに `backgroundImageUrl?: string` 追加
- **Firebase Storage設定追加**
  - `storage.rules` 新規作成
  - `/user_images/{userId}/*` パスで画像を公開保存
  - 本人のみ書き込み可、全員読み取り可

### Technical
- StorageService新規作成:
  - Base64デコード、画像検証（サイズ・Content-Type）
  - Firebase Storageへのアップロード
  - 公開URL生成
- UploadProfileImageUseCase/UploadCardBackgroundUseCase新規作成
- PublicCardRepositoryのマッパーに `backgroundImageUrl` 対応追加
- 統合テスト追加: 10テストケース（画像アップロード機能）
- ユニットテスト追加: 3テストケース（StorageService）

### Security
- 画像アップロードは認証必須
- 本人のみ自分の画像をアップロード可能（Storage Rules検証）
- 画像サイズ・Content-TypeをHandler層とStorage Rulesで二重検証
- 許可Content-Type: `image/jpeg`, `image/png`, `image/webp` のみ
- PIIやトークンは画像メタデータに含めない

---

## [0.5.0] - 2025-10-27

### Added
- **Badge Management System - Phase 2** (Issue #33)
  - **Callable Function: `updateBadgeVisibility`** (認証必須)
    - ユーザーが自分のバッジ表示設定を変更
    - PublicCard/PrivateCardごとに表示/非表示を制御
    - パラメータ: `{badgeId, showOnPublicCard: boolean, showOnPrivateCard: boolean}`
  - **Callable Function: `getUserBadges`** (公開)
    - 指定ユーザーの所持バッジ一覧を取得
    - visibility設定を含む
    - パラメータ: `{userId}`

### Changed
- **`getPublicCard` API拡張**
  - レスポンスに `badges?: string[]` フィールド追加
  - `showOnPublicCard=true` のバッジIDのみ含まれる
  - バッジがない場合は `undefined`
- **`getPrivateCard` API拡張**
  - レスポンスに `badges?: string[]` フィールド追加
  - `showOnPrivateCard=true` のバッジIDのみ含まれる
  - バッジがない場合は `undefined`
- **Domain Model拡張**
  - `PublicCard` インターフェースに `badges?: string[]` 追加
  - `PrivateCard` インターフェースに `badges?: string[]` 追加

### Technical
- BadgeRepositoryに新メソッド追加:
  - `findUserBadges(userId)`: ユーザーの全バッジ取得
  - `updateVisibility(userId, badgeId, visibility)`: バッジ表示設定更新
  - `getBadgeIdsForPublicCard(userId)`: PublicCard表示用バッジID取得
  - `getBadgeIdsForPrivateCard(userId)`: PrivateCard表示用バッジID取得
- GetPublicCardUseCase/GetPrivateCardUseCaseにバッジ統合ロジック追加
- 統合テスト追加: 7テストケース（Phase 2機能）

### Note
- `getSavedCards` へのバッジ統合は今後対応予定
- 既存APIへの非破壊的な拡張のみ（後方互換性あり）

---

## [0.4.0] - 2025-10-27

### Added
- **Badge Management System - Phase 1** (Issue #32)
  - **Moderator System**: Firebase Auth Custom Claimsを使用した権限管理
    - `moderator` claim: モデレーターまたは管理者の場合 `true`
    - `admin` claim: 管理者の場合 `true`
  - **Callable Function: `addModerator`** (Admin専用)
    - モデレーターまたは新しい管理者を追加
    - Custom Claimsの自動設定
    - `/moderators/{userId}` コレクションにメタデータ保存
  - **Callable Function: `createBadge`** (Moderator/Admin専用)
    - プラットフォーム全体で使用するバッジを作成
    - バッジ名（1-50文字）、説明（1-500文字）、アイコンURL、カラー、優先度を設定
    - `/badges/{badgeId}` コレクションに保存
  - **Callable Function: `listBadges`** (公開)
    - アクティブなバッジの一覧を取得
    - 優先度順（昇順）にソート
    - 認証不要
  - **Callable Function: `grantBadge`** (Moderator/Admin専用)
    - ユーザーにバッジを付与
    - 付与理由の記録（任意）
    - デフォルトvisibility設定: `{showOnPublicCard: true, showOnPrivateCard: true}`
    - `/users/{userId}/badges/{badgeId}` に保存
  - **Callable Function: `revokeBadge`** (Moderator/Admin専用)
    - ユーザーからバッジを剥奪
    - `/users/{userId}/badges/{badgeId}` を削除
  - **Domain Models**: Badge, UserBadge, Moderator
  - **Custom Error Classes**: `BadgeNotFoundError`, `UnauthorizedModeratorError`, `BadgeAlreadyGrantedError`
  - **Integration Tests**: 17テストケースでバッジ管理機能を網羅的にテスト

### Technical
- Clean Architecture（Domain, Application, Infrastructure層）を採用
- TDD（Test-Driven Development）によるテストファースト開発
- Firestoreセキュリティルールの更新：
  - `/badges/{badgeId}`: 読み取り公開、書き込みはCloud Functionsのみ
  - `/moderators/{userId}`: 読み書きともにCloud Functionsのみ
  - `/users/{userId}/badges/{badgeId}`: 読み取り公開、書き込みはCloud Functionsのみ

### Note
- Phase 2（Issue #33）では、バッジのvisibility制御と既存API（`getPublicCard`, `getPrivateCard`, `getSavedCards`）へのバッジ統合を実装予定

---

## [0.3.0] - 2025-10-27

### Added
- **Callable Function: `createExchangeToken`** - プライベート名刺交換用の一時トークン生成API
  - QRコード交換フローの実装に必要
  - トークンは1分間有効、1回限り使用
  - `qrCodeData` フィールドで QRコード生成用データ（`devcard://exchange/{tokenId}`）を提供
- **Domain: Custom Error Classes** - カスタムエラークラスの導入
  - `UserNotFoundError`, `PublicCardNotFoundError`, `PrivateCardNotFoundError`
  - `SavedCardNotFoundError`, `ExchangeTokenNotFoundError`, `SavedCardIdCollisionError`
  - 文字列マッチングから `instanceof` チェックへの移行でエラーハンドリングの保守性向上

### Changed
- **`getSavedCards` のページネーション追加** (Issue #25)
  - `startAfter` パラメータ追加：前回取得した最後の `savedCardId` を指定して続きを取得
  - 無限スクロール実装が可能に
  - **⚠️ デフォルト `limit` 値の変更: 100 → 20**
    - 既存コードで明示的に `limit` を指定していない場合、取得件数が変わります
    - 必要に応じて `limit: 100` を明示的に指定してください
- **更新検知ロジックの境界条件修正** (Issue #20)
  - `hasUpdate` の計算を `lastKnownUpdatedAt < masterUpdatedAt` から `lastKnownUpdatedAt <= masterUpdatedAt` に変更
  - 同じミリ秒での更新も正しく検知可能に
- **GitHubApiClient の null/空文字列ハンドリング改善** (Issue #18)
  - `name`, `bio` フィールドで null または空文字列を明示的に `undefined` に変換
  - データ正規化の明確化

### Fixed
- **savedCardId 重複チェック機能の追加** (Issue #21 - Critical)
  - ID生成時に重複チェック（最大3回リトライ）
  - `.set()` から `.create()` に変更して既存データの上書きを防止
  - データ破壊リスクの排除
- **cardType マイグレーション対応** (Issue #24)
  - v0.2.0以前のデータ（`cardType` が未定義）に対して "public" をデフォルト値として設定
  - 既存ユーザーへの影響を解消
- **エラーハンドリングの統一** (Issue #17)
  - 全てのUseCaseとHandlerでカスタムエラークラスを使用
  - `ProfileUpdateTransaction`, `UpdatePrivateCardUseCase` でのエラー処理を改善
  - 文字列マッチング（`error.message.includes("not found")`）から型チェック（`instanceof`）へ移行

### Internal
- **テストカバレッジの向上**
  - 単体テスト: 63個全てパス（100%）
  - 統合テスト: 58個全てパス（個別実行時）
  - Issue #17, #18, #20, #23 に対応したテストケース追加
- **コード品質の改善**
  - Lint エラー 0件（警告7件は非nullアサーションで許容範囲）
  - カスタムエラークラスによる型安全性の向上

### Migration Guide

**`getSavedCards` のデフォルト limit 変更への対応**:

```typescript
// v0.2.0 の動作（デフォルト 100件取得）
await getSavedCards({});

// v0.3.0 の動作（デフォルト 20件取得）
await getSavedCards({});  // 20件のみ取得される

// v0.2.0 と同じ動作を維持したい場合
await getSavedCards({ limit: 100 });  // 明示的に指定
```

**ページネーション（無限スクロール）の実装例**:

```typescript
// 初回取得
const firstPage = await getSavedCards({ limit: 20 });

// 次のページ取得
const lastCard = firstPage.savedCards[firstPage.savedCards.length - 1];
const secondPage = await getSavedCards({
  limit: 20,
  startAfter: lastCard.savedCardId
});
```

**QRコード交換フローの実装**:

```typescript
// 1. トークン生成
const token = await createExchangeToken({});
// { tokenId: "abc...", expiresAt: "2025-...", qrCodeData: "devcard://exchange/abc..." }

// 2. QRコード表示
<QRCode value={token.qrCodeData} />

// 3. 相手側でQRコード読み取り後
await savePrivateCard({ tokenId: "abc..." });
```

### Breaking Changes
- **`getSavedCards` のデフォルト `limit` が 100 → 20 に変更**
  - 影響: 明示的に `limit` を指定していないコードで取得件数が変わります
  - 対応: 以前と同じ動作を維持したい場合は `limit: 100` を明示的に指定してください

### Non-Breaking Changes
- `createExchangeToken` API の追加（新規API）
- `getSavedCards` の `startAfter` パラメータ追加（オプショナル）
- `hasUpdate` 計算ロジックの改善（より正確に）
- `cardType` のデフォルト値設定（既存データ互換性向上）
- エラーハンドリングの改善（内部実装）

---

## [0.2.0] - 2025-10-26

### Added
- **Callable Function: `getPublicCard`** - 公開名刺を取得（認証不要、Webでの名刺共有を実現）
- **Callable Function: `updateProfile`** - ユーザーが自分のプロフィール情報（displayName, bio, photoURL）を更新
- **Callable Function: `manualSync`** - 外部サービス（現在はGitHub）の最新情報を公開名刺に手動同期
- **Callable Function: `updatePrivateCard`** - プライベート名刺の連絡先情報を更新
- **Callable Function: `getPrivateCard`** - 自分のプライベート名刺を取得
- **Callable Function: `savePrivateCard`** - トークンを使用して他ユーザーのプライベート名刺を保存
- **Callable Function: `markAsViewed`** - 保存済み名刺を閲覧済みにマーク（更新通知をクリア）
- **Callable Function: `deleteSavedCard`** - 保存済み名刺を削除
- **Domain: `IGitHubService`** - GitHub API連携のインターフェース定義
- **Domain: PrivateCard** - プライベート連絡先情報のドメインモデル
- **Domain: ExchangeToken** - プライベート名刺交換用の1分間有効な使い捨てトークン
- **Infrastructure: `GitHubApiClient`** - GitHub REST API v3を使用したユーザー情報取得の実装
- **Infrastructure: `ExchangeTokenRepository`** - トークンのライフサイクル管理（生成、検証、削除）
- **Infrastructure: `PrivateCardRepository`** - プライベート名刺のFirestore操作
- **Update Detection System** - 保存済み名刺の更新検知（`hasUpdate`フラグ）

### Changed
- **⚠️ BREAKING: `getSavedCards` レスポンス構造の大幅変更**
  - `savedCardId`追加（ランダムID）
  - `cardType`追加（"public" | "private"）
  - `hasUpdate`追加（更新検知フラグ）
  - `lastKnownUpdatedAt`追加（更新検知用タイムスタンプ）
  - `lastViewedAt`追加（閲覧済み管理）
  - cardTypeに応じた条件付きフィールド（Public: bio, connectedServices / Private: email, phoneNumber等）
  - フィルタリングオプション追加（cardType, eventId, limit）
- **`saveCard` の動作変更**
  - savedCardIdをランダム生成（以前はcardUserId固定）
  - `cardType: "public"`を明示的に保存
  - `lastKnownUpdatedAt`を保存（更新検知用）
  - 既存の保存済み名刺がある場合でもエラーにならず、新規作成を行う
- **`updateProfile` の動作拡張**
  - PrivateCardの同期更新を追加（displayName, photoURL）
  - Firestoreトランザクションで3箇所同時更新（User, PublicCard, PrivateCard）
- **`manualSync` の動作変更**
  - 同期成功時のみ `PublicCard.updatedAt`を更新（エラー時は更新しない）
- **`PublicCard.connectedServices`** - GitHubサービス情報（username, avatarUrl, bio, profileUrl）を含むようになりました

### Data Structures
- `/private_cards/{userId}` - プライベート連絡先情報（email, phoneNumber, lineId, discordId, twitterHandle, otherContacts）
- `/users/{userId}/exchange_tokens/{tokenId}` - プライベート名刺交換用トークン（1分間有効、1回限り）
- `/users/{userId}/saved_cards/{savedCardId}` - ランダムIDに変更、cardType/hasUpdate/lastKnownUpdatedAt/lastViewedAtを追加

### Security
- トークンベースの安全なプライベート名刺交換（1分間有効、1回限り使用）
- 所有者のみが自分のPrivateCardを参照・更新可能
- トークン検証時の厳格なチェック（所有者、有効期限、使用状況）
- PrivateCard情報は認証・認可を通過したユーザーのみアクセス可能

### Migration Guide
**`getSavedCards`の破壊的変更への対応**:

**以前の構造**:
```typescript
{
  success: true,
  savedCards: Array<{
    cardUserId: string;
    savedAt: string;
    memo?: string;
    // ...公開名刺フィールド
  }>
}
```

**新しい構造**:
```typescript
{
  success: true,
  savedCards: Array<{
    savedCardId: string;           // NEW: ランダムID
    cardUserId: string;
    cardType: "public" | "private"; // NEW
    hasUpdate: boolean;             // NEW: 更新検知
    savedAt: string;
    lastKnownUpdatedAt?: string;    // NEW
    lastViewedAt?: string;          // NEW
    memo?: string;
    // cardTypeに応じたフィールド
  }>
}
```

**必要な対応**:
1. `savedCardId`を使用して名刺を識別（以前は`cardUserId`を使用）
2. `cardType`で表示を切り替え（Public/Privateで異なるフィールド）
3. `hasUpdate`フラグで更新バッジを表示
4. `markAsViewed` APIで閲覧済みマーク
5. `deleteSavedCard` APIで削除（`savedCardId`を指定）

---

## [0.1.0] - 2025-10-26

### Added
- **Auth Trigger: `onUserCreate`** - 新規ユーザー登録時に自動的にプロフィールと公開名刺を作成
- **Callable Function: `saveGitHubToken`** - GitHubのOAuthアクセストークンを保存
- **Callable Function: `saveCard`** - 他ユーザーの公開名刺を自分のコレクションに保存
- **Callable Function: `getSavedCards`** - 保存した名刺一覧を公開名刺の詳細と共に取得

### Data Structures
- `/users/{userId}` - ユーザーの非公開プロフィール
- `/public_cards/{userId}` - 公開名刺データ
- `/users/{userId}/saved_cards/{cardUserId}` - 保存した名刺のメタデータ

### Infrastructure
- Clean Architecture (3層) を採用
- TDDで開発、全テスト合格
- contractsディレクトリの初期化
- API_CONTRACT.md v0.1.0 の作成
- contract-sync.yml ワークフロー（develop → Web自動同期）

---

## フォーマット

### カテゴリ
- `Added`: 新機能
- `Changed`: 既存機能の変更
- `Deprecated`: 非推奨化
- `Removed`: 削除
- `Fixed`: バグ修正
- `Security`: セキュリティ関連
