# Changelog

このファイルは、API仕様の変更履歴を記録します。
フロントエンド・iOSチームに変更を伝える際の差分の根拠となります。

このCHANGELOGは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に準拠します。

---

## [Unreleased]

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
