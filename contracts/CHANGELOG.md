# Changelog

このファイルは、API仕様の変更履歴を記録します。
フロントエンド・iOSチームに変更を伝える際の差分の根拠となります。

このCHANGELOGは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に準拠します。

---

## [Unreleased]

### Added
- **Callable Function: `getPublicCard`** - 公開名刺を取得（認証不要、Webでの名刺共有を実現）
- **Callable Function: `updateProfile`** - ユーザーが自分のプロフィール情報（displayName, bio, photoURL）を更新
- **Callable Function: `manualSync`** - 外部サービス（現在はGitHub）の最新情報を公開名刺に手動同期
- **Domain: `IGitHubService`** - GitHub API連携のインターフェース定義
- **Infrastructure: `GitHubApiClient`** - GitHub REST API v3を使用したユーザー情報取得の実装

### Changed
- **`PublicCard.connectedServices`** - GitHubサービス情報（username, avatarUrl, bio, profileUrl）を含むようになりました

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
