# Backend Architecture

このドキュメントは、DevCardバックエンドの構造と責務の境界を説明します。

## アーキテクチャ原則

このプロジェクトは **Clean Architecture** をベースとした3層構造を採用しています。

```
handlers/ (Infrastructure Layer)
    ↓
application/ (Use Case Layer)
    ↓
domain/ (Domain Layer)
    ↑
infrastructure/ (Repository Implementation)
```

## レイヤー構成

### 1. Domain Layer (`domain/`)

**責務**: ビジネスの核となるエンティティとルールを定義する。

- エンティティ（例: `User.ts`, `PublicCard.ts`, `SavedCard.ts`）
- リポジトリインターフェース（例: `IUserRepository.ts`）
- ドメインロジック（例: バリデーション、不変条件の保護）

**依存関係**: 他のレイヤーに依存しない。

**ビジネスロジックを書いてよい場所**: ✅ YES
エンティティの整合性を保つロジック、ドメインルールはここに書く。

### 2. Application Layer (`application/`)

**責務**: ユースケースを実現する。ビジネスフローを制御する。

- UseCase（例: `CreateUserUseCase.ts`, `SaveCardUseCase.ts`）
- サービス（例: `SanitizeService.ts`）
- トランザクション境界の定義

**依存関係**: Domainに依存する。Infrastructureには依存しない（DIする）。

**ビジネスロジックを書いてよい場所**: ✅ YES
複数のエンティティを跨ぐフロー、認可判断、副作用の制御はここに書く。

### 3. Infrastructure Layer (`infrastructure/` と `handlers/`)

**責務**: 外部システムとの接続、フレームワークへの適合。

#### `infrastructure/`
- リポジトリ実装（例: `UserRepository.ts` → Firestore接続）
- 外部API呼び出し

#### `handlers/`
- Cloud Functions エントリーポイント
- HTTPリクエスト/レスポンスの変換
- Firebase Auth連携
- 入力バリデーション

**依存関係**: ApplicationとDomainに依存する。

**ビジネスロジックを書いてよい場所**: ❌ NO
ここにはビジネス判断を書かない。UseCaseを呼び出すだけ。

## データフロー

```
リクエスト
  ↓
Handler (入力検証、認証確認)
  ↓
UseCase (ビジネスフロー、認可判断)
  ↓
Domain (エンティティ操作)
  ↓
Repository (永続化)
  ↓
レスポンス
```

## 認証と認可の決定点

- **認証 (Authentication)**: Firebase Authが担当。Handlerレベルで確認する。
- **認可 (Authorization)**: UseCaseレベルで判断する。
  - 例: 「このユーザーはこのカードを保存できるか？」→ `SaveCardUseCase`内で判定

## 外部副作用の発生場所

- **メール通知**: UseCaseから呼び出す
- **ジョブキュー**: UseCaseから呼び出す
- **ログ出力**: 各層で可能だが、機密情報は絶対に出さない（後述）

## このアーキテクチャを守る理由

- **テスタビリティ**: 各層を独立してテストできる
- **保守性**: ビジネスロジックが散らばらない
- **交換可能性**: FirestoreをRDBに変えても、Domain/Applicationは無傷

---

**注意**: このドキュメントは「システムがどう構成されているか」を記述するものであり、「どう変更するか」の手順書ではありません。
