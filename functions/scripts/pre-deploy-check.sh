#!/bin/bash

# =============================================================================
# Pre-Deploy Check Script for DevCard Backend
# =============================================================================
# このスクリプトはデプロイ前に以下をチェックします：
# 1. ユニットテスト合格
# 2. 統合テスト合格
# 3. Lint エラー 0件
# 4. TypeScript ビルド成功
# 5. API契約ファイルの存在確認
#
# 使用方法:
#   cd functions
#   chmod +x scripts/pre-deploy-check.sh
#   ./scripts/pre-deploy-check.sh
# =============================================================================

set -e  # エラー時に即座に終了

# カラーコード定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ヘッダー表示
echo "========================================"
echo "   DevCard Pre-Deploy Check Script"
echo "========================================"
echo ""

# カレントディレクトリ確認
CURRENT_DIR=$(basename "$PWD")
if [ "$CURRENT_DIR" != "functions" ]; then
    log_error "このスクリプトは functions/ ディレクトリから実行してください"
    log_info "実行方法: cd functions && ./scripts/pre-deploy-check.sh"
    exit 1
fi

# ========================================
# チェック1: Node.js バージョン確認
# ========================================
log_info "Node.js バージョンを確認中..."
NODE_VERSION=$(node --version)
REQUIRED_VERSION="v22"

if [[ $NODE_VERSION == $REQUIRED_VERSION* ]]; then
    log_success "Node.js バージョン OK: $NODE_VERSION"
else
    log_error "Node.js v22 が必要です（現在: $NODE_VERSION）"
    exit 1
fi

# ========================================
# チェック2: 依存関係のインストール確認
# ========================================
log_info "依存関係の確認中..."
if [ ! -d "node_modules" ]; then
    log_warning "node_modules が存在しません。npm install を実行します..."
    npm install
fi
log_success "依存関係 OK"

# ========================================
# チェック3: Lint チェック
# ========================================
log_info "Lint チェック実行中..."
if npm run lint; then
    log_success "Lint チェック OK（エラー 0件）"
else
    log_error "Lint エラーが見つかりました"
    log_info "修正方法: npm run lint:fix"
    exit 1
fi

# ========================================
# チェック4: TypeScript ビルド
# ========================================
log_info "TypeScript ビルド実行中..."
if npm run build; then
    log_success "TypeScript ビルド OK"
else
    log_error "ビルドエラーが発生しました"
    exit 1
fi

# ========================================
# チェック5: ユニットテスト実行
# ========================================
log_info "ユニットテスト実行中..."
if npm run test:unit; then
    log_success "ユニットテスト OK（全テスト合格）"
else
    log_error "ユニットテストが失敗しました"
    exit 1
fi

# ========================================
# チェック6: 統合テスト実行
# ========================================
log_info "統合テスト実行中（時間がかかる場合があります）..."
if npm run test:integration; then
    log_success "統合テスト OK（全テスト合格）"
else
    log_error "統合テストが失敗しました"
    exit 1
fi

# ========================================
# チェック7: API契約ファイルの存在確認
# ========================================
log_info "API契約ファイルの確認中..."
cd ..

if [ ! -f "contracts/API_CONTRACT.md" ]; then
    log_error "contracts/API_CONTRACT.md が見つかりません"
    exit 1
fi

if [ ! -f "contracts/CHANGELOG.md" ]; then
    log_error "contracts/CHANGELOG.md が見つかりません"
    exit 1
fi

if [ ! -f "contracts/openapi.yaml" ]; then
    log_warning "contracts/openapi.yaml が見つかりません（オプショナル）"
fi

log_success "API契約ファイル OK"

# ========================================
# チェック8: Git の状態確認
# ========================================
log_info "Git の状態確認中..."

# 未コミットの変更をチェック
if [ -n "$(git status --porcelain)" ]; then
    log_warning "未コミットの変更があります"
    git status --short
    echo ""
    read -p "このままデプロイを続けますか？ (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        log_info "デプロイをキャンセルしました"
        exit 1
    fi
else
    log_success "Git の状態 OK（未コミットの変更なし）"
fi

# 現在のブランチとコミット表示
CURRENT_BRANCH=$(git branch --show-current)
CURRENT_COMMIT=$(git rev-parse --short HEAD)
log_info "現在のブランチ: $CURRENT_BRANCH"
log_info "現在のコミット: $CURRENT_COMMIT"

# ========================================
# チェック9: .work/item.json の状態確認
# ========================================
log_info ".work/item.json の確認中..."

if [ -f ".work/item.json" ]; then
    STATUS=$(grep -oP '(?<="status": ")[^"]+' .work/item.json || echo "unknown")

    if [ "$STATUS" == "draft" ] || [ "$STATUS" == "ready-for-review" ]; then
        log_warning ".work/item.json の status が '$STATUS' です"
        log_warning "マージ後は status を 'merged' に変更するか、ファイルを削除してください"
    else
        log_success ".work/item.json の状態 OK"
    fi
else
    log_success ".work/item.json なし（問題なし）"
fi

# ========================================
# 最終確認
# ========================================
echo ""
echo "========================================"
echo "   ✅ すべてのチェックが完了しました！"
echo "========================================"
echo ""
log_success "デプロイ準備が整いました"
echo ""
log_info "デプロイコマンド:"
echo "  1. Firestore Rules デプロイ: firebase deploy --only firestore:rules,firestore:indexes,storage"
echo "  2. Functions デプロイ:      firebase deploy --only functions"
echo ""
log_warning "本番環境へのデプロイは慎重に行ってください"
echo ""

exit 0
