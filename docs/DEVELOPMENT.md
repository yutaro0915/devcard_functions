# DevCard 開発ガイド

## TDD開発フロー

### 原則
**「テストを通すためにテストを修正する」のは本末転倒**

正しい順序：
1. API仕様の議論・確定
2. 仕様に基づいてテストを書く
3. テストを実装の真実とする
4. 実装をテストに合わせる

### 機能追加・修正の手順

#### 1. API設計フェーズ
```
- レスポンス構造を議論
- フロントエンドの使いやすさを考慮
- 型定義を先に書く（domain層）
```

**例：**
```typescript
// 先に決める
interface GetSavedCardsResponse {
  savedCards: Array<{
    cardUserId: string;
    memo: string | null;
    tags: string[] | null;
    savedAt: Timestamp;
    // PublicCard詳細をフラット化
    displayName: string;
    bio: string | null;
    photoURL: string | null;
  }>;
}
```

#### 2. テスト作成フェーズ
```bash
# 結合テスト（エミュレーター必須）
cd functions
pnpm test:integration

# 単体テスト
pnpm test:unit
```

**結合テストを先に書く理由：**
- 実際のCloud Functionsの動作を検証
- レスポンス構造の確認
- エンドツーエンドの動作保証

#### 3. 実装フェーズ
```
テストに合格するまで実装を修正
- UseCase層
- Handler層
- Repository層（必要なら）
```

#### 4. 検証フェーズ
```bash
# 全テスト実行
pnpm test

# エミュレーターで手動確認
firebase emulators:start
```

## ドキュメント管理方針

### 保持するドキュメント
- `docs/REQUIREMENTS.md` - 要件定義（プロダクトの真実）
- `docs/MVP_ROADMAP.md` - 開発ロードマップ
- `docs/DEVELOPMENT.md` - このファイル（開発方針）

### ドキュメント化しないもの
- API仕様 → **結合テストとコードが真実**
- ユースケース分析 → **UseCaseクラスが真実**
- データ構造 → **Domain層の型定義が真実**

**理由：** 更新されないドキュメントはゴミ以下。コードと乖離したドキュメントは有害。

## テスト戦略

### 単体テスト（UseCase層）
```typescript
// functions/src/__tests__/application/*.test.ts
// モックを使用、ビジネスロジックのみ検証
```

### 結合テスト（Cloud Functions全体）
```typescript
// functions/src/__tests__/integration/*.test.ts
// Firebase Emulator経由で実際の関数呼び出し
// レスポンス構造、認証、エラーハンドリングを検証
```

### テスト実行コマンド
```bash
pnpm test              # 全テスト
pnpm test:unit         # 単体テストのみ
pnpm test:integration  # 結合テストのみ（要エミュレーター起動）
pnpm test:watch        # Watchモード
```

## エミュレーター設定

### プロジェクトID
- Emulator: `dev-card-ae929`
- Region: `us-central1`（エミュレーターは常にus-central1）

### ポート
- Auth: 9099
- Functions: 5001
- Firestore: 8080
- Emulator UI: 4000

### 起動
```bash
firebase emulators:start
```

## コミットガイドライン

### コミット前チェック
```bash
# ビルド確認
cd functions && pnpm build

# lint確認
pnpm lint

# テスト実行
pnpm test
```

### コミットメッセージ
```
[feat] 機能追加
[fix] バグ修正
[refactor] リファクタリング
[test] テスト追加・修正
[docs] ドキュメント更新
```

## よくある問題

### テストが `not-found` で失敗
- エミュレーターが起動しているか確認
- プロジェクトIDが `dev-card-ae929` か確認
- Regionが未指定（または `us-central1`）か確認

### ビルドエラー
```bash
# libディレクトリを削除して再ビルド
rm -rf lib && pnpm build
```

### エミュレーターが古いコードを実行
```bash
# エミュレーター完全停止
pkill -f firebase

# 再ビルド・再起動
pnpm build
firebase emulators:start
```

## 今後の開発方針

1. **API変更は議論から開始**
2. **結合テストを先に書く**
3. **実装をテストに合わせる**
4. **ドキュメントは最小限に**（コードが真実）
