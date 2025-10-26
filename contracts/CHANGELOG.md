# Changelog

このファイルは、API仕様の変更履歴を記録します。
フロントエンド・iOSチームに変更を伝える際の差分の根拠となります。

このCHANGELOGは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に準拠します。

---

## [Unreleased]

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
