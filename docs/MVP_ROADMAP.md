# DevCard MVP Roadmap

## 📊 現在の状況（2025-01-XX更新）
- **Backend (Cloud Functions):** ✅ MVP完成（7/9関数実装済み）
- **Frontend (Next.js):** 🚧 設計・実装開始中
- **戦略変更:** Web版でも全機能利用可能にする（iOS専用から方針転換）

---

## Phase 1: Core MVP 🎯 ✅ **Backend完了**

**目標: 基本的な名刺作成・編集・公開ができる**

### Backend (Cloud Functions) ✅ **完成**

#### ✅ 実装完了（7関数）
- [x] **onUserCreate** - Auth onCreate trigger
  - `/users` と `/public_cards` 自動作成
  - CreateUserUseCase, GeneratePublicCardUseCase

- [x] **updateProfile** - プロフィール編集
  - `/users` と `/public_cards` 同期更新
  - UpdateProfileUseCase

- [x] **getPublicCard** - 公開カード取得
  - Web表示用API
  - GetPublicCardUseCase

- [x] **saveGitHubToken** - GitHubトークン保存
  - `/users/{userId}.githubAccessToken` に保存
  - SaveGitHubTokenUseCase

- [x] **manualSync** - 外部データ同期
  - GitHub API連携（基本実装）
  - SyncGitHubDataUseCase

- [x] **saveCard / getSavedCards** - 名刺保存・取得
  - イベント・ネットワーキング機能
  - SaveCardUseCase, GetSavedCardsUseCase

#### ✅ アーキテクチャ
- [x] 3層レイヤードアーキテクチャ
- [x] ユニットテスト完備（24 tests passed）
- [x] ESLint設定（`any`禁止）
- [x] Firestore Security Rules

#### ❌ Phase 2に延期
- [ ] **saveCustomCss** - CSS保存（サニタイズ付き）
- [ ] **scheduledSync** - 定期自動同期
- [ ] Qiita/Zenn/X連携

### Frontend (Next.js) 🚧 **実装開始中**

#### 📋 設計完了
- [x] API仕様書作成 (`API_SPECIFICATION.md`)
- [x] ユースケース分析 (`USECASE_ANALYSIS.md`)
- [x] データ型設計（null vs undefined戦略確定）
  - **Backend:** `string | null`
  - **Frontend:** `string | undefined` (optional)
  - **変換:** Zod + transform パターン

#### 🚧 実装中
- [ ] プロジェクト初期化
- [ ] Firebase SDK統合
- [ ] 公開名刺ページ (`pages/[userId].tsx`)
  - SSR/SSG実装
  - Firestore直接読み取り
  - OGP対応
- [ ] 認証機能（Firebase Auth）
- [ ] ダッシュボード（マイページ）
- [ ] プロフィール編集UI
- [ ] 名刺保存・管理UI

### iOS App - Phase 2
- [ ] Firebase Auth (GitHub/X)
- [ ] プロフィール編集画面
- [ ] 共有機能（UIActivityViewController）
- [ ] Universal Links設定

---

## Phase 2: External Integrations 🔗 (後日)

**目標: GitHub/Qiita/Zenn等の外部サービスと連携**

### GitHub連携
- [ ] OAuth完全フロー実装
  - iOS側でのトークン取得
  - トークン有効期限管理

- [ ] `manualSync` の完全実装 ✅（基本実装済み）
- [ ] トークンリフレッシュロジック
- [ ] エラーハンドリング強化

### 他サービス
- [ ] Qiita API連携
- [ ] Zenn API連携（RSS or Scraping）
- [ ] X (Twitter) API連携

### 自動同期
- [ ] `scheduledSync` 実装 (Cloud Scheduler)
- [ ] Webhook対応（GitHub/Qiita）
- [ ] 差分更新の最適化

---

## Phase 3: Advanced Features ⚡ (後日)

**目標: ネットワーキング・イベント機能の強化**

### SavedCard機能の活用
- [ ] 名刺交換履歴の可視化
- [ ] タグ・メモ機能の強化
- [ ] イベント別管理

### イベント連携
- [ ] connpassイベント連動
- [ ] QRコード生成・スキャン
- [ ] 名刺交換カウント

### 分析機能
- [ ] プロフィール閲覧数
- [ ] 名刺交換統計
- [ ] 人気コンテンツ分析

---

## 技術的負債・改善項目

### セキュリティ
- [ ] Rate Limiting実装
- [ ] Input Validation強化
- [ ] CORS設定の最適化

### パフォーマンス
- [ ] Cloud Functions Cold Start対策
- [ ] Firestore Index最適化
- [ ] 画像最適化（Cloudinary/imgix検討）

### テスト
- [ ] Integration Tests追加
- [ ] E2E Tests (Playwright)
- [ ] CI/CD整備

---

## 📈 実装状況サマリー

### Backend Cloud Functions
| 関数 | 状態 | テスト | 用途 |
|-----|------|--------|------|
| `onUserCreate` | ✅ 完成 | ✅ | ユーザー登録時の自動処理 |
| `updateProfile` | ✅ 完成 | ✅ | プロフィール編集 |
| `getPublicCard` | ✅ 完成 | ✅ | 公開名刺取得 |
| `saveGitHubToken` | ✅ 完成 | ✅ | GitHubトークン保存 |
| `manualSync` | ✅ 完成 | ✅ | GitHub同期 |
| `saveCard` | ✅ 完成 | ✅ | 名刺保存 |
| `getSavedCards` | ✅ 完成 | ✅ | 保存済み名刺取得 |
| `saveCustomCss` | ❌ Phase 2 | - | CSS保存 |
| `scheduledSync` | ❌ Phase 2 | - | 定期同期 |

**テストカバレッジ:** 8 test suites, 24 tests passed

### Frontend (Next.js)
| 機能 | 状態 | 備考 |
|-----|------|------|
| プロジェクト初期化 | 🚧 | 別リポジトリで実装中 |
| Firebase SDK統合 | 📋 | 設計完了 |
| 公開名刺ページ | 📋 | SSR/SSG設計完了 |
| データ型戦略 | ✅ | Zod + transform |
| OGP設定 | 📋 | 設計完了 |
| 認証機能 | 📋 | - |
| ダッシュボード | 📋 | - |

---

## 🎯 次のマイルストーン

### Milestone 1: Web閲覧機能（最優先）
**目標:** 公開名刺をWebで閲覧できる

- [ ] Next.jsプロジェクト初期化
- [ ] `pages/[userId].tsx` 実装（SSR）
- [ ] Firestore直接読み取り
- [ ] 基本的なスタイリング
- [ ] OGP設定
- [ ] Emulatorでの動作確認

**所要時間:** 1-2時間

### Milestone 2: Web編集機能
**目標:** Webでプロフィール編集・同期ができる

- [ ] Firebase Auth統合
- [ ] ダッシュボード（マイページ）
- [ ] プロフィール編集UI
- [ ] Cloud Functions呼び出し実装
  - `updateProfile`
  - `manualSync`
- [ ] GitHub連携フロー

**所要時間:** 3-4時間

### Milestone 3: 名刺管理機能
**目標:** 他人の名刺を保存・管理できる

- [ ] 名刺保存UI
- [ ] 保存済み名刺一覧
- [ ] タグ・メモ機能
- [ ] イベント管理

**所要時間:** 2-3時間

---

---

## 🔧 技術的決定事項

### データ型戦略
- **Backend (Firestore):** `null` を使用
- **Frontend (TypeScript):** `undefined` (optional) を使用
- **変換方法:** Zod schema の `.nullable().transform(v => v ?? undefined)`

### アーキテクチャ方針
- **Web版でも全機能利用可能**（iOS専用ではない）
- **ロジックはCloud Functionsに集約**
- **Firestoreからの直接読み取りは閲覧機能のみ**
- **編集・管理はCloud Functions経由**

### セキュリティ
- `any`の使用禁止（ESLint設定済み）
- Firestoreセキュリティルール完備
- OAuth トークンは`/users`コレクションに保存（本人のみアクセス可）

---

## ⚠️ 未解決の課題

### 1. GitHub OAuth フロー（50%完成）
**現状:**
- `saveGitHubToken` と `manualSync` は実装済み
- しかし、iOS/WebでのOAuthトークン取得方法が未定義

**次のステップ:**
- Firebase Auth GitHub Providerからトークン取得方法の調査
- または独自OAuth実装の検討

### 2. 定期同期
- `scheduledSync` 関数は Phase 2 に延期
- Cloud Scheduler の設定が必要

### 3. CSS編集機能
- SanitizeService は部分実装（テスト不完全）
- Phase 2 に延期

---

## 📝 ドキュメント

### 作成済み
- [x] `API_SPECIFICATION.md` - 完全なAPI仕様書
- [x] `USECASE_ANALYSIS.md` - ユースケース分析
- [x] `MVP_ROADMAP.md` - このファイル
- [x] `firestore.rules` - セキュリティルール
- [x] 全UseCaseのユニットテスト

### 今後必要
- [ ] Next.js実装ガイド（README）
- [ ] デプロイ手順書
- [ ] 環境構築ガイド
