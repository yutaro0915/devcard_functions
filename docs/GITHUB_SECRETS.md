# GitHub Secrets 設定ガイド

contract-sync.yml ワークフローを有効化するために必要なSecretsの設定手順です。

---

## 必要なSecrets

### `WEB_REPO_TOKEN`

**用途:**
Webクライアントリポジトリ (`yutaro0915/devcard_nextjs`) への書き込み権限を持つPersonal Access Token。

**必要な権限 (scopes):**
- `repo` (Full control of private repositories)
  - `repo:status`
  - `repo_deployment`
  - `public_repo`
  - `repo:invite`
  - `security_events`
- `workflow` (Update GitHub Action workflows)

**発行手順:**

1. GitHubにログイン
2. Settings > Developer settings > Personal access tokens > Tokens (classic)
3. "Generate new token (classic)" をクリック
4. 必要な設定:
   - **Note**: `DevCard Backend to Web Sync`
   - **Expiration**: `No expiration` または `90 days`（推奨）
   - **Scopes**: 上記の `repo` と `workflow` を選択
5. "Generate token" をクリック
6. トークンをコピー（⚠️ この画面を離れると二度と表示されません）

**バックエンドリポジトリへの登録:**

1. `yutaro0915/devcard_functions` リポジトリを開く
2. Settings > Secrets and variables > Actions
3. "New repository secret" をクリック
4. 以下を入力:
   - **Name**: `WEB_REPO_TOKEN`
   - **Secret**: コピーしたトークンを貼り付け
5. "Add secret" をクリック

---

## 検証方法

### ワークフローが正しく動作するか確認

1. `contracts/` ディレクトリを変更してmainにマージ
2. Actions タブで `Contract Sync to Web Client` ワークフローを確認
3. 正常に実行されると:
   - Webリポに新しいブランチ `sync/contracts/<YYYYMMDD-HHMM>` が作成される
   - PRが自動作成される
   - Issueが自動作成される（PR番号がリンクされる）

### トラブルシューティング

**エラー: `refusing to allow an OAuth App to create or update workflow`**
- `workflow` スコープが不足しています。トークンを再発行してください。

**エラー: `Resource not accessible by integration`**
- `repo` スコープが不足しています。トークンに十分な権限があるか確認してください。

**エラー: `branch not found`**
- Webリポに `dev` または `main` ブランチが存在するか確認してください。

---

## セキュリティ上の注意

- PATは強力な権限を持つため、絶対に公開しないでください
- 定期的にトークンを再発行し、古いトークンは削除してください
- 不要になったトークンは即座に削除してください
- トークンが漏洩した場合は、即座にrevoke（無効化）してください

---

## トークンの更新

有効期限が切れる前に新しいトークンを発行し、Secretsを更新してください。

1. 上記手順で新しいトークンを発行
2. リポジトリの Secrets 画面で `WEB_REPO_TOKEN` を更新
3. 古いトークンを GitHub Developer settings から削除
