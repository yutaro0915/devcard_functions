# Command: /prepare-sync

## 目的

実装・テスト完了後、**developへのPRに向けてコミットメッセージ候補を生成**するコマンド。
`.work/item.json` の内容を元に、適切なコミットメッセージを提案する。

**注意**: GitHub ActionsはdevelopマージFULL後に `.work/item.json` を直接読み込むため、`.sync-metadata.json` のような中間ファイルは不要。

---

## あなた（Claude）がやるべきこと

### 1. .work/item.json の読み込みと確認

> **参照**: docs/DEVELOPMENT_PROCESS.md の「.work/item.json の位置づけ」

**最初に必ず実施**：

1. `.work/item.json` を読み込む
2. `status` が "ready-for-review" であることを確認
   - "draft" の場合 → `/implement-contract-change` を先に実行するよう促す
   - "merged" の場合 → 既に同期済みであることを通知
3. 以下のフィールドが埋まっていることを確認：
   - `feature_name`
   - `api_changes[]`
   - `client_work_items[]`
   - `breaking_changes`
   - `notes_for_frontend`

---

### 2. バックエンド側コミットメッセージの生成

.work/item.json の内容を元に、コミットメッセージ候補を3パターン提示：

#### パターン1: 簡潔版（推奨）
```
feat(contracts): [feature_name]

[api_changes[] の概要を箇条書き、2-3行]
```

#### パターン2: 詳細版
```
feat(contracts): [feature_name]

API Changes:
[api_changes[] の詳細]

Client Impact:
[client_work_items[] の概要]

Tests:
[tests_required[] の概要]
```

#### パターン3: Conventional Commits準拠
```
feat(contracts)[!]: [feature_name]

[breaking_changes が true の場合のみ "!" を追加]

BREAKING CHANGE: [破壊的変更の詳細 または "None"]

[api_changes[] の詳細]
```

---

## 参照すべき情報

### 必須参照ドキュメント

1. **docs/CONTRIBUTION_RULES.md** - PR提出時の必須項目、破壊的変更の定義
2. **docs/DEVELOPMENT_PROCESS.md** - 差分の同期フロー

### 契約ファイル

1. **.work/item.json** - 唯一の真実
2. `contracts/CHANGELOG.md` - 今回追加した変更履歴
3. `contracts/API_CONTRACT.md` - 更新された仕様
4. `contracts/openapi.yaml` - 更新されたスキーマ

---

## 禁止事項

> **参照**: docs/CONTRIBUTION_RULES.md

以下を**絶対に行わない**：

- ❌ .work/item.json を直接編集する（既に ready-for-review のはず）
- ❌ contracts/ を直接編集する（既に更新済みのはず）
- ❌ コミットやPRを自動作成する（ユーザーがレビューする）
- ❌ GitHub Actionsを直接実行する（developマージ時に自動発火）
- ❌ 素材の内容を勝手に省略・簡略化する

---

## 成功条件

以下がすべて満たされていること：

- ✅ .work/item.json の status が "ready-for-review" である
- ✅ コミットメッセージ候補が3パターン提示されている
- ✅ 破壊的変更の有無が明記されている
- ✅ ユーザーがコミットメッセージをレビュー・選択できる状態

---

## 出力形式

以下の順序で出力すること：

### 1. .work/item.json の確認

```
Feature: [feature_name]
Status: [status]
Breaking Changes: [true/false]
```

### 2. コミットメッセージ候補

```
パターン1: 簡潔版（推奨）
[メッセージ]

パターン2: 詳細版
[メッセージ]

パターン3: Conventional Commits
[メッセージ]
```

### 3. 次のアクション

```
推奨される次のステップ:
1. コミットメッセージを選択（または編集）
2. 変更をコミット（選択したメッセージで）
3. develop へPR作成
4. PRをマージ
5. マージ後、GitHub Actionsが自動的に:
   - .work/item.json を読み込む
   - contracts/ のみをフロントエンドに同期
   - PR/Issue本文を .work/item.json から生成
   - Web側にPR/Issue作成
```

---

## GitHub Actions連携

developマージ後、以下のワークフローが自動実行される：

- `.github/workflows/contract-sync.yml`
  - `develop` へcontracts変更マージ時に発火
  - **.work/item.json を直接読み込む**
  - `backend_commit_sha` を `git rev-parse HEAD` で取得
  - **contracts/ のみ**をフロントエンドリポジトリへ同期（.work/ は除外）
  - `.work/item.json` の内容からPR/Issue本文を生成
  - `devcard_nextjs` リポジトリの `develop` ブランチへPR作成
  - 同時にIssue作成（`client_work_items[]` が実装指示になる）

**重要**: `.work/` ディレクトリはバックエンド内部の作業管理用であり、フロントエンドには同期されない。
