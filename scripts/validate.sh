#!/bin/bash
#
# AICouncil Plugin Self-Validation Script
#
# This script runs all validation checks to ensure the plugin is working correctly.
# Use this before committing or to verify your local setup.
#
# Usage: ./scripts/validate.sh [options]
#   --quick    Run only smoke tests (fast)
#   --full     Run all tests including integration (slow)
#   --ci       Run CI-like validation
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

MODE="${1:---quick}"

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    local missing=()

    if ! command -v node &> /dev/null; then
        missing+=("Node.js")
    else
        print_success "Node.js: $(node --version)"
    fi

    if ! command -v npm &> /dev/null; then
        missing+=("npm")
    else
        print_success "npm: $(npm --version)"
    fi

    if [ ${#missing[@]} -ne 0 ]; then
        print_error "Missing prerequisites: ${missing[*]}"
        exit 1
    fi
}

# Install dependencies
install_deps() {
    print_header "Installing Dependencies"

    if [ -d "node_modules" ]; then
        print_info "node_modules exists, skipping install (use --ci to force)"
    else
        npm ci
        print_success "Dependencies installed"
    fi
}

# Run type checking
check_types() {
    print_header "Type Checking"

    if npm run typecheck; then
        print_success "Type check passed"
    else
        print_error "Type check failed"
        return 1
    fi
}

# Run smoke tests
run_smoke_tests() {
    print_header "Running Smoke Tests"

    if npm test -- --testPathPattern="smoke" --reporter=dot; then
        print_success "Smoke tests passed"
    else
        print_error "Smoke tests failed"
        return 1
    fi
}

# Run unit tests
run_unit_tests() {
    print_header "Running Unit Tests"

    if npm test -- --testPathIgnorePatterns="integration|smoke|real-api" --reporter=dot; then
        print_success "Unit tests passed"
    else
        print_error "Unit tests failed"
        return 1
    fi
}

# Run integration tests
run_integration_tests() {
    print_header "Running Integration Tests"

    if npm test -- --testPathPattern="integration" --testPathIgnorePatterns="real-api"; then
        print_success "Integration tests passed"
    else
        print_error "Integration tests failed"
        return 1
    fi
}

# Build the project
build_project() {
    print_header "Building Project"

    npm run build
    print_success "Build completed"
}

# Verify build
verify_build() {
    print_header "Verifying Build"

    if "$SCRIPT_DIR/verify-build.sh"; then
        print_success "Build verification passed"
    else
        print_error "Build verification failed"
        return 1
    fi
}

# Test package can be packed
test_pack() {
    print_header "Testing Package Pack"

    cd packages/aicouncil-plugin

    if npm pack; then
        print_success "Package can be packed successfully"
        # Clean up
        rm -f ./*.tgz
    else
        print_error "Package packing failed"
        return 1
    fi

    cd "$PROJECT_ROOT"
}

# Check documentation
check_docs() {
    print_header "Checking Documentation"

    local docs_ok=true

    if [ ! -f "README.md" ]; then
        print_error "README.md not found"
        docs_ok=false
    else
        print_success "README.md exists"
    fi

    if [ ! -f "README.zh-CN.md" ]; then
        print_warning "README.zh-CN.md not found (optional)"
    else
        print_success "README.zh-CN.md exists"
    fi

    if [ ! -f "packages/aicouncil-plugin/TESTING.md" ]; then
        print_warning "TESTING.md not found"
    else
        print_success "TESTING.md exists"
    fi

    if [ "$docs_ok" = false ]; then
        return 1
    fi
}

# Main validation flow
case "$MODE" in
    --quick)
        print_header "AICouncil Plugin Validation (Quick Mode)"
        check_prerequisites
        install_deps
        check_types
        run_smoke_tests
        print_header "Quick Validation Complete!"
        print_info "Run with --full for comprehensive validation"
        ;;

    --full)
        print_header "AICouncil Plugin Validation (Full Mode)"
        check_prerequisites
        install_deps
        check_types
        run_smoke_tests
        run_unit_tests
        run_integration_tests
        build_project
        verify_build
        test_pack
        check_docs
        print_header "Full Validation Complete!"
        print_success "All checks passed!"
        ;;

    --ci)
        print_header "AICouncil Plugin Validation (CI Mode)"
        check_prerequisites
        install_deps
        check_types
        run_smoke_tests
        run_unit_tests
        build_project
        verify_build
        test_pack
        print_header "CI Validation Complete!"
        print_success "All checks passed!"
        ;;

    *)
        echo "Usage: $0 [--quick|--full|--ci]"
        echo ""
        echo "Options:"
        echo "  --quick    Run only smoke tests (fast, ~30s)"
        echo "  --full     Run all tests including integration (slow, ~5min)"
        echo "  --ci       Run CI-like validation (no real API calls)"
        echo ""
        exit 1
        ;;
esac
