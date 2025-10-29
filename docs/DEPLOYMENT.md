# Deployment Guide

このドキュメントは、DevCardバックエンドをFirebase本番環境にデプロイする際の完全な手順書です。

---

## 📋 目次

1. [デプロイ前の準備](#デプロイ前の準備)
2. [デプロイ手順](#デプロイ手順)
3. [デプロイ後の確認](#デプロイ後の確認)
4. [トラブルシューティング](#トラブルシューティング)
5. [ロールバック手順](#ロールバック手順)

---

## デプロイ前の準備

### 1. 前提条件の確認

```bash
# Node.jsバージョン確認（v22が必須）
node --version  # v22.x.x

# Firebase CLIのインストール確認
firebase --version

# ログイン確認
firebase login

# プロジェクト確認
firebase projects:list
firebase use dev-card-ae929
```

### 2. コード品質の最終確認

プロジェクトルートで以下を実行：

```bash
# デプロイ前チェックスクリプト実行
cd functions
chmod +x scripts/pre-deploy-check.sh
./scripts/pre-deploy-check.sh
```

このスクリプトは以下をチェックします：
- ✅ 全ユニットテスト合格
- ✅ 全統合テスト合格
- ✅ Lintエラー0件
- ✅ TypeScriptビルド成功
- ✅ API契約ファイル(`contracts/`)の整合性

### 3. 環境変数・シークレットの設定

#### 3.1 Firebase Configの設定

本番環境で必要な設定値を Firebase Functions Config に保存：

```bash
# GitHub OAuth設定（必要に応じて）
firebase functions:config:set github.client_id="YOUR_GITHUB_CLIENT_ID"
firebase functions:config:set github.client_secret="YOUR_GITHUB_CLIENT_SECRET"

# CORS設定（フロントエンドのドメイン）
firebase functions:config:set cors.allowed_origins="https://devcard.com,https://www.devcard.com"

# 設定確認
firebase functions:config:get
```

#### 3.2 Firebase Secret Manager（推奨）

機密情報は Secret Manager を使用：

```bash
# GitHub トークンをシークレットとして保存
echo -n "YOUR_GITHUB_CLIENT_SECRET" | firebase functions:secrets:set GITHUB_CLIENT_SECRET

# シークレット一覧確認
firebase functions:secrets:access GITHUB_CLIENT_SECRET
```

### 4. Firebase コンソールでの設定確認

Firebase Console (`https://console.firebase.google.com/project/dev-card-ae929`) で以下を確認：

#### 4.1 Authentication
- [ ] 許可する認証プロバイダーを有効化（Email/Password, Google, GitHub等）
- [ ] 承認済みドメインに本番ドメインを追加

#### 4.2 Firestore Database
- [ ] データベースが `asia-northeast1` リージョンに作成済み
- [ ] Security Rules が適切に設定されている

#### 4.3 Storage
- [ ] Storage Bucket が作成済み
- [ ] CORS設定が適切（`storage.rules` でカバー）

#### 4.4 Functions
- [ ] 請求アカウントが有効（Blaze プラン必須）
- [ ] 使用量アラートの設定（予算超過防止）

---

## デプロイ手順

### ステップ1: 最終確認とブランチの状態チェック

```bash
# 現在のブランチ確認（develop または main）
git branch --show-current

# 未コミットの変更がないことを確認
git status

# 最新のコミットを確認
git log --oneline -5
```

### ステップ2: Firestore Rules と Indexes のデプロイ

**重要**: Functions より先に Rules をデプロイしてセキュリティホールを防ぐ。

```bash
# プロジェクトルートで実行
firebase deploy --only firestore:rules,firestore:indexes,storage
```

**確認事項**:
- デプロイ成功メッセージが表示される
- Firestore Consoleで Rules が更新されている

### ステップ3: Firebase Functions のデプロイ

```bash
# 全Functionsをデプロイ
firebase deploy --only functions
```

**自動実行される内容** (`firebase.json` の `predeploy` 設定):
1. `npm run lint` - Lint チェック
2. `npm run build` - TypeScript コンパイル (`functions/src` → `functions/lib`)

**デプロイ時間**: 約5-10分（初回は長め）

**デプロイ中の出力例**:
```
✔  functions: Finished running predeploy script.
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
i  functions: ensuring required API cloudbuild.googleapis.com is enabled...
✔  functions: required API cloudfunctions.googleapis.com is enabled
✔  functions: required API cloudbuild.googleapis.com is enabled
i  functions: preparing codebase default for deployment
i  functions: current functions in codebase default: saveCard, ...
i  functions: uploading functions code...
✔  functions: functions code uploaded successfully
...
✔  Deploy complete!
```

### ステップ4: 特定のFunctionのみデプロイ（部分更新）

修正が特定のFunctionのみの場合：

```bash
# 単一Functionのデプロイ
firebase deploy --only functions:saveCard

# 複数Functionのデプロイ
firebase deploy --only functions:saveCard,functions:getSavedCards
```

---

## デプロイ後の確認

### 1. デプロイされたFunctionsの確認

```bash
# デプロイされたFunction一覧とURL確認
firebase functions:list

# 出力例:
# ┌─────────────────────┬────────────────────────────────────────────┐
# │ Function Name       │ URL                                         │
# ├─────────────────────┼────────────────────────────────────────────┤
# │ saveCard            │ https://us-central1-dev-card-ae929...      │
# │ getPublicCard       │ https://us-central1-dev-card-ae929...      │
# └─────────────────────┴────────────────────────────────────────────┘
```

### 2. ログの監視

```bash
# リアルタイムでログを監視
firebase functions:log

# 特定のFunctionのログのみ表示
firebase functions:log --only saveCard

# 最新50行のログ表示
firebase functions:log --limit 50
```

### 3. 本番環境での動作テスト

#### 3.1 Firebase Consoleから手動実行

1. Firebase Console → Functions → 対象のFunction選択
2. 「テスト」タブ → リクエストボディを入力して実行
3. レスポンスとログを確認

#### 3.2 クライアントアプリからの実行

```typescript
// Web/iOSクライアントから実際に呼び出し
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const getPublicCard = httpsCallable(functions, 'getPublicCard');

const result = await getPublicCard({ userId: 'test-user-id' });
console.log(result.data);
```

### 4. エラーチェック

```bash
# 過去1時間のエラーログを確認
firebase functions:log --only-errors

# 特定のFunctionのエラーのみ
firebase functions:log --only saveCard --only-errors
```

### 5. パフォーマンスモニタリング

Firebase Console → Functions → パフォーマンスタブで以下を確認：
- 実行時間（平均・P95）
- 呼び出し回数
- エラー率
- メモリ使用量

---

## トラブルシューティング

### 問題1: デプロイが失敗する

#### エラー: `Lint errors found`

```bash
# 原因: Lintエラーがある
# 解決策:
cd functions
npm run lint:fix
npm run lint
```

#### エラー: `Build failed`

```bash
# 原因: TypeScriptのコンパイルエラー
# 解決策:
cd functions
npm run build
# エラー内容を確認して修正
```

#### エラー: `insufficient permissions`

```bash
# 原因: Firebase プロジェクトへのアクセス権限がない
# 解決策:
firebase login --reauth
firebase use dev-card-ae929
```

### 問題2: Functionが実行時にエラーを返す

#### エラー: `unauthenticated`

- 原因: Firebase Auth の設定が不足
- 解決策: Firebase Console → Authentication → Settings → 承認済みドメインを確認

#### エラー: `not-found` (Firestore)

- 原因: Firestore Rules が厳しすぎる、またはデータが存在しない
- 解決策: Firestore Console でデータとRulesを確認

#### エラー: `internal` (500エラー)

```bash
# ログで詳細なエラー内容を確認
firebase functions:log --only saveCard --only-errors --limit 100
```

### 問題3: パフォーマンスが遅い

#### コールドスタート（初回実行の遅延）

```bash
# 解決策: Functions に minInstances を設定（コスト増加に注意）
# functions/src/index.ts で設定:
export const saveCard = onCall(
  { minInstances: 1, region: 'us-central1' },
  async (request) => { ... }
);
```

#### メモリ不足

```bash
# 解決策: Functions のメモリを増やす
# functions/src/index.ts で設定:
export const saveCard = onCall(
  { memory: '512MiB', region: 'us-central1' },
  async (request) => { ... }
);
```

---

## ロールバック手順

### 方法1: Firebase Consoleから以前のバージョンに戻す

1. Firebase Console → Functions
2. 対象のFunction選択 → 「バージョン履歴」タブ
3. 以前のバージョンを選択 → 「ロールバック」ボタン

### 方法2: CLIで特定バージョンをロールバック

```bash
# 特定のFunctionをロールバック
firebase rollback functions:saveCard

# 確認プロンプトが表示される
# "Are you sure you want to roll back saveCard?" → Yes
```

### 方法3: Gitで以前のコミットに戻して再デプロイ

```bash
# 以前のコミットを確認
git log --oneline -10

# 安全なコミットにリセット
git checkout <commit-sha>

# 再デプロイ
firebase deploy --only functions

# または、developブランチに戻す
git checkout develop
```

### ロールバック後の確認

```bash
# デプロイされたバージョンを確認
firebase functions:list

# ログで正常動作を確認
firebase functions:log --limit 20
```

---

## デプロイチェックリスト

デプロイ前に以下を確認してください：

- [ ] 全ユニットテスト合格（84件）
- [ ] 全統合テスト合格（144件）
- [ ] Lint エラー 0件
- [ ] TypeScript ビルド成功
- [ ] `contracts/API_CONTRACT.md` が最新
- [ ] `contracts/CHANGELOG.md` が更新済み
- [ ] `contracts/openapi.yaml` が更新済み
- [ ] `.work/item.json` の status が `merged` または削除済み
- [ ] Firebase Authentication 設定完了
- [ ] Firestore Rules デプロイ完了
- [ ] Storage Rules デプロイ完了
- [ ] 環境変数・シークレット設定完了
- [ ] 使用量アラート設定完了
- [ ] ロールバック手順の理解完了

---

## セキュリティチェックリスト

本番デプロイ前に必ず確認：

- [ ] Firestore Rules で本番データが保護されている
- [ ] Storage Rules で画像アップロード権限が適切
- [ ] Firebase Auth で許可する認証プロバイダーが限定されている
- [ ] Functions の環境変数に機密情報がハードコードされていない
- [ ] CORS設定が本番ドメインのみに制限されている
- [ ] API呼び出し制限（Rate Limiting）を検討
- [ ] PII（個人識別情報）がログに出力されていない

---

## コスト最適化のヒント

Firebase の料金を抑えるために：

1. **Functions の実行時間を最小化**
   - 不要な処理を削減
   - 並列処理を活用

2. **Firestore の読み取り回数を削減**
   - クライアント側でキャッシュ
   - `limit()` を使ってデータ取得量を制限

3. **Storage の転送量を削減**
   - 画像サイズを最適化（5MB制限を活用）
   - CDNキャッシュを活用

4. **Functions の minInstances を最小限に**
   - 本当に必要なFunction以外は 0 に設定

5. **アラート設定**
   - Firebase Console → 使用量とお支払い → 予算アラート設定

---

## 参考リンク

- [Firebase Functions ドキュメント](https://firebase.google.com/docs/functions)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase CLI リファレンス](https://firebase.google.com/docs/cli)
- [DevCard API Contract](/contracts/API_CONTRACT.md)
- [DevCard Changelog](/contracts/CHANGELOG.md)

---

**最終更新**: 2025-10-28
**対象バージョン**: v0.8.0
