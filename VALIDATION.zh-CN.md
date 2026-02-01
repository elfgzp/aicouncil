# AICouncil Automated Validation Documentation

This document describes the automated validation mechanisms to ensure code quality and a smooth user onboarding experience.

## Validation Layers

### 1. Smoke Tests (Fast Validation)
- **Location**: `packages/aicouncil-plugin/src/__tests__/smoke/`
- **Runtime**: ~1-2 seconds
- **Purpose**: Quickly verify basic plugin functionality

```bash
npm run test:smoke
```

**Validated**:
- Plugin exports correctly
- Tools are registered properly
- Provider Adapter initializes correctly
- Internationalization works

### 2. Unit Tests
- **Location**: `.test.ts` files alongside modules
- **Runtime**: ~10-20 seconds
- **Purpose**: Verify individual module functionality

```bash
npm test
```

**Validated**:
- Council core logic
- Participant management
- Round management
- Provider adapter
- Tool commands
- i18n internationalization

### 3. Integration Tests
- **Location**: `src/__tests__/integration/`
- **Runtime**: ~30-60 seconds
- **Purpose**: Verify complete workflows

```bash
npm run test:integration
```

**Validated**:
- Complete multi-round discussion flow
- Error recovery mechanisms
- State management
- Configuration handling

### 4. Real API Tests (Optional)
- **Location**: `src/__tests__/integration/real-api.test.ts`
- **Runtime**: ~2-5 minutes
- **Purpose**: Verify real API calls

```bash
# Requires environment variables
export KIMI_API_KEY="your-key"
export MINIMAX_API_KEY="your-key"
export ENABLE_REAL_API_TESTS=true

npm run test:real-api
```

### 5. Build Verification
- **Script**: `scripts/verify-build.sh`
- **Runtime**: ~5 seconds
- **Purpose**: Verify build artifacts are complete

```bash
npm run verify-build
```

**Validated**:
- dist directory exists
- All required files present
- package.json is valid
- File sizes are reasonable

## Local Validation

### Quick Validation (Recommended for daily development)
```bash
npm run validate
# or
./scripts/validate.sh --quick
```

This runs:
1. Type checking
2. Smoke tests

### Full Validation (Recommended before release)
```bash
npm run validate:full
# or
./scripts/validate.sh --full
```

This runs:
1. Type checking
2. All tests
3. Build verification
4. Pack testing

### CI Mode Validation
```bash
npm run validate:ci
# or
./scripts/validate.sh --ci
```

Same validation flow as CI environment.

## CI/CD Integration

### GitHub Actions Workflow

#### CI Workflow (`.github/workflows/ci.yml`)

Includes the following jobs:

1. **smoke-test**: Fast validation to catch issues early
2. **test**: Run full tests on Node 18.x and 20.x
3. **build-verify**: Build and verify artifacts
4. **lint**: Code formatting check
5. **pack-test**: Verify npm pack succeeds

#### Release Workflow (`.github/workflows/release.yml`)

Automatically runs on release:
1. Run all tests
2. Build project
3. Publish to npm
4. Create GitHub Release

## Status Badges

Recommended badges for README:

```markdown
![CI](https://github.com/elfgzp/aicouncil/workflows/CI/badge.svg)
```

## Troubleshooting

### Smoke tests failing
```bash
# Check dependencies
npm ci

# Run smoke tests separately
npm run test:smoke
```

### Build verification failing
```bash
# Rebuild
npm run build

# Run verification
npm run verify-build
```

### Type checking failing
```bash
npm run typecheck
```

## Adding New Tests

### Adding a Smoke Test
Create a new test file in `packages/aicouncil-plugin/src/__tests__/smoke/`:

```typescript
import { describe, it, expect } from 'vitest'
import { someFunction } from '../../index'

describe('New Feature Smoke', () => {
  it('should work', () => {
    expect(someFunction()).toBe(true)
  })
})
```

### Adding a Unit Test
Create a `.test.ts` file alongside the module:

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from './myModule'

describe('myModule', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expected)
  })
})
```

## Coverage Report

Generate and view coverage report:

```bash
npm run test:coverage
```

Coverage report is generated in `coverage/` directory.

Target coverage:
- Core modules: >90%
- Tools: >85%
- Utilities: >80%
- Overall: >85%
