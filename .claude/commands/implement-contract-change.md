# Command: /implement-contract-change

## 目的

`/plan-contract-change` で承認された変更を、**TDD手順に従って実装**するコマンド。
「テスト → 実装 → ドキュメント更新」という順序を厳守し、契約の一貫性を保証する。

---

## あなた（Claude）がやるべきこと

### 実行順序（厳守）

以下の順序を**必ず守る**こと。順序を入れ替えてはならない。

---

### ステップ0: .work/item.json の読み込み

> **参照**: docs/DEVELOPMENT_PROCESS.md の「.work/item.json の位置づけ」

**最初に必ず実施**：

1. `.work/item.json` を読み込む
2. `tests_required[]` を確認（これが実装すべきテストケースのリスト）
3. `security_notes[]` を確認（実装時に考慮すべきセキュリティ要件）
4. `api_changes[]` を確認（実装すべき変更内容）

---

### ステップ0.5: 既存コードの事前調査（**必須！テストを書く前に実行**）

**目的**: テストや実装で使用する既存インターフェース・クラスのメソッド名・シグネチャを事前に確認し、`findById` vs `findByUserId` のような命名ミスを防ぐ。

**必ず実施すること**：

1. **依存するRepositoryインターフェースを全て読む**
   ```bash
   # 例: PublicCardを扱う場合
   Read functions/src/domain/IPublicCardRepository.ts
   Read functions/src/domain/IUserRepository.ts
   ```
   - メソッド名（`findById` か `findByUserId` か？）
   - 引数の型と順序
   - 戻り値の型

2. **既存の類似テストを読む**
   ```bash
   # 例: 既存のUseCaseテストパターンを確認
   Read functions/src/__tests__/unit/application/UpdateProfileUseCase.test.ts
   ```
   - モックの作り方（特に外部ライブラリ: axios, firestoreなど）
   - テストの命名規則
   - アサーションのパターン

3. **外部ライブラリの既存利用パターンを確認**
   ```bash
   # 例: axiosを使う場合、既存のaxios利用例を探す
   Grep "import.*axios" functions/src
   ```
   - 既存コードでのimport方法
   - エラーハンドリングのパターン

**確認後、以下を明示的に出力**：
```markdown
## 事前調査結果

### 使用するインターフェース
- `IPublicCardRepository`:
  - メソッド: `findByUserId(userId: string): Promise<PublicCard | null>`
  - メソッド: `update(userId: string, data: Partial<PublicCard>): Promise<void>`
- `IUserRepository`:
  - メソッド: `findById(userId: string): Promise<User | null>`

### 既存テストパターン
- axiosのモック: `jest.mock("axios")` + 型アサーション
- Repositoryのモック: `jest.Mocked<IRepository>` パターン

### 注意点
- PublicCardは `findByUserId` を使う（`findById` ではない！）
- axiosエラーは `isAxiosError()` ではなく型アサーションでチェック
```

**この調査をスキップした場合、実装後にメソッド名ミスが発覚し、手戻りが発生する。**

---

### ステップ1: テストコードの追加・更新

#### 1.1 結合テストの作成
`functions/src/__tests__/integration/` 配下に、新しいエンドポイントまたは変更されたエンドポイント用の結合テストを追加する。

**テスト内容:**
- **.work/item.json の `tests_required[]` をすべて実装**
- Firebase Emulator経由で実際のCloud Functionsを呼び出す形式
- レスポンス構造、ステータスコード、エラーメッセージを検証

**例:**
```typescript
it("should create new resource successfully", async () => {
  const result = await createResource({ name: "test" });
  expect(result.data).toHaveProperty("success", true);
  expect(result.data).toHaveProperty("resourceId");
});

it("should fail with validation error when name is missing", async () => {
  await expect(createResource({})).rejects.toThrow();
});
```

#### 1.2 単体テストの追加（必要な場合）
新しいUseCaseを追加する場合、`functions/src/__tests__/application/` 配下に単体テストを作成する。

**この段階では、テストは赤（失敗）でよい。**

---

### ステップ2: 本実装コードの提案

> **参照**: docs/BACKEND_ARCHITECTURE.md の「レイヤー構成」および「データフロー」

テストを満たすための実装コードを、以下のレイヤーごとに提案する：

#### 2.1 Domain層
- 新しい型定義（`domain/` 配下）
- インターフェース定義
- **参照**: docs/BACKEND_ARCHITECTURE.md - Domain Layer

#### 2.2 Application層
- 新しいUseCase（`application/` 配下）
- ビジネスロジック、認可判断の実装
- **参照**: docs/BACKEND_ARCHITECTURE.md - Application Layer
- **参照**: docs/SECURITY_AND_VALIDATION.md - 認可の実装場所

#### 2.3 Infrastructure層
- Repository実装（必要な場合）
- 外部サービス連携（必要な場合）
- **参照**: docs/BACKEND_ARCHITECTURE.md - Infrastructure Layer

#### 2.4 Handlers層
- Cloud Functions エンドポイント（`handlers/` 配下）
- 入力バリデーション、認証確認
- `index.ts` へのexport追加
- **参照**: docs/BACKEND_ARCHITECTURE.md - Infrastructure/Handlers
- **参照**: docs/SECURITY_AND_VALIDATION.md - 入力バリデーション

#### 2.5 実装の提示形式
```markdown
## 実装コード

### 1. Domain層
[ファイルパスと実装コード]

### 2. Application層
[ファイルパスと実装コード]

### 3. Handlers層
[ファイルパスと実装コード]

### 4. index.ts 修正
[export追加]
```

---

### ステップ3: テスト実行と検証

実装後、以下を確認する：

```bash
cd functions
pnpm build
pnpm test:integration  # 結合テストがすべてパス
pnpm test:unit         # 単体テストがすべてパス
```

**すべてのテストが緑（成功）になることを確認**してから次へ進む。

---

### ステップ4: Contracts と .work/item.json の更新案

> **参照**: docs/DEVELOPMENT_PROCESS.md の「ステップ4: API契約を更新する」

実装が完了し、テストが通ったことを前提に、以下のファイルの更新案を提示する：

#### 4.0 `.work/item.json`
以下のフィールドを更新：
- `status`: "ready-for-review" に変更
- `breaking_changes`: 実装を通じて確定した破壊的変更の有無
- `security_notes[]`: 実装で対応したセキュリティ配慮を反映

#### 4.1 `contracts/API_CONTRACT.md`
新しいエンドポイントまたは変更されたエンドポイントのセクションを追加・更新。

**記載内容:**
- エンドポイントパス
- HTTPメソッド（該当する場合）
- 認証要件
- リクエストパラメータ
- レスポンス構造（成功・失敗）
- エラーコード

#### 4.2 `contracts/openapi.yaml`
OpenAPI形式での定義を追加・更新。

**記載内容:**
- `paths` セクションへのエンドポイント追加
- `components/schemas` へのデータモデル追加
- 認証スキーム（必要な場合）

#### 4.3 `contracts/CHANGELOG.md`
変更履歴を追記。

**記載形式:**
```markdown
### YYYY-MM-DD

#### Added
- 新しいエンドポイント `functionName`: [説明]

#### Changed
- `functionName`: [変更内容]

#### Fixed
- `functionName`: [修正内容]
```

---

### ステップ5: 最終チェックリスト

以下をすべて満たしていることを確認する：

- ✅ 結合テストがすべてパス
- ✅ 単体テストがすべてパス（該当する場合）
- ✅ ESLintエラーなし
- ✅ TypeScriptビルドエラーなし
- ✅ `.work/item.json` 更新済み（status: "ready-for-review"）
- ✅ `contracts/API_CONTRACT.md` 更新済み
- ✅ `contracts/openapi.yaml` 更新済み
- ✅ `contracts/CHANGELOG.md` 更新済み

---

## 参照すべき情報

### 必須参照ドキュメント

1. **docs/DEVELOPMENT_PROCESS.md** - テスト駆動開発のフロー
2. **docs/BACKEND_ARCHITECTURE.md** - レイヤー構成、実装すべき場所
3. **docs/SECURITY_AND_VALIDATION.md** - バリデーション、認可の実装方法
4. **docs/CONTRIBUTION_RULES.md** - 必ずやること、やってはいけないこと

### 実装参照

1. **.work/item.json** - 実装すべき内容の唯一の真実
2. `functions/src/` 配下の既存ディレクトリ構成
3. `functions/src/__tests__/integration/setup.ts` - 結合テストのセットアップ方法
4. `contracts/` 配下の現行ファイル

---

## 禁止事項

> **参照**: docs/CONTRIBUTION_RULES.md および docs/DEVELOPMENT_PROCESS.md

以下を**絶対に行わない**：

- ❌ **ステップ0.5（事前調査）をスキップする** - テストを書く前に必ず既存インターフェースを確認すること
- ❌ テストを書かずにいきなり実装する（docs/DEVELOPMENT_PROCESS.md: ステップ1が必須）
- ❌ `contracts/` を先に更新して実装を後回しにする（docs/DEVELOPMENT_PROCESS.md: 実装が「正」）
- ❌ テストが赤のまま次のステップに進む（docs/DEVELOPMENT_PROCESS.md: 検証が必須）
- ❌ 計画にない機能を勝手に追加する（docs/CONTRIBUTION_RULES.md: 仕様を勝手に拡張しない）
- ❌ エミュレーターを起動する（`npm run dev`等は実行禁止）
- ❌ **メソッド名やシグネチャを推測で書く** - 必ず実際のインターフェースファイルを読んで確認すること

---

## 成功条件

以下がすべて満たされていること：

- ✅ **ステップ0.5の事前調査を実施し、結果を出力している**
- ✅ .work/item.json の `tests_required[]` がすべてテストコードとして実装されている
- ✅ テストファーストでコードが書かれている
- ✅ すべてのテストが緑（成功）
- ✅ 実装コードが3層アーキテクチャに従っている
- ✅ .work/item.json の `status` が "ready-for-review" に更新されている
- ✅ `contracts/` の3ファイル（API_CONTRACT.md, openapi.yaml, CHANGELOG.md）すべてが更新されている
- ✅ コミット可能な状態になっている

---

## 出力形式

以下の順序で出力すること：

1. **.work/item.json の確認** - 読み込んだ内容のサマリ（tests_required[], security_notes[]）
2. **事前調査結果**（ステップ0.5） - 使用するインターフェースのメソッド名・シグネチャ、既存テストパターンを明示
3. **テストコード** - まず追加・更新するテストを提示
4. **実装コード** - Domain → Application → Handlers の順
5. **.work/item.json 更新案** - status, breaking_changes の更新
6. **Contracts更新案** - 3ファイルの差分を提示
7. **検証コマンド** - 実行すべきテストコマンド
8. **次のステップ** - `/prepare-sync` への移行提案
