# AICouncil 自动化验证文档

本文档介绍项目的自动化验证机制，确保代码质量和用户上手可用。

## 验证层级

### 1. Smoke Tests (快速验证)
- **位置**: `packages/aicouncil-plugin/src/__tests__/smoke/`
- **运行时间**: ~1-2 秒
- **用途**: 快速验证插件基本功能

```bash
npm run test:smoke
```

**验证内容**:
- 插件是否正确导出
- 工具是否正确注册
- Provider Adapter 是否正确初始化
- 国际化是否正常工作

### 2. 单元测试
- **位置**: 各模块的 `.test.ts` 文件
- **运行时间**: ~10-20 秒
- **用途**: 验证各个模块的功能

```bash
npm test
```

**验证内容**:
- Council 核心逻辑
- Participant 管理
- Round 轮次管理
- Provider 适配器
- 工具命令
- i18n 国际化

### 3. 集成测试
- **位置**: `src/__tests__/integration/`
- **运行时间**: ~30-60 秒
- **用途**: 验证完整流程

```bash
npm run test:integration
```

**验证内容**:
- 完整的多轮讨论流程
- 错误恢复机制
- 状态管理
- 配置处理

### 4. 真实 API 测试 (可选)
- **位置**: `src/__tests__/integration/real-api.test.ts`
- **运行时间**: ~2-5 分钟
- **用途**: 验证真实 API 调用

```bash
# 需要设置环境变量
export KIMI_API_KEY="your-key"
export MINIMAX_API_KEY="your-key"
export ENABLE_REAL_API_TESTS=true

npm run test:real-api
```

### 5. 构建验证
- **脚本**: `scripts/verify-build.sh`
- **运行时间**: ~5 秒
- **用途**: 验证构建产物完整

```bash
npm run verify-build
```

**验证内容**:
- dist 目录存在
- 所有必需文件存在
- package.json 有效
- 文件大小合理

## 本地验证

### 快速验证 (推荐日常开发使用)
```bash
npm run validate
# 或
./scripts/validate.sh --quick
```

这会运行:
1. 类型检查
2. Smoke tests

### 完整验证 (推荐发布前使用)
```bash
npm run validate:full
# 或
./scripts/validate.sh --full
```

这会运行:
1. 类型检查
2. 所有测试
3. 构建验证
4. 打包测试

### CI 模式验证
```bash
npm run validate:ci
# 或
./scripts/validate.sh --ci
```

与 CI 环境相同的验证流程。

## CI/CD 集成

### GitHub Actions 工作流

#### CI 工作流 (`.github/workflows/ci.yml`)

包含以下任务:

1. **smoke-test**: 快速验证，第一时间发现问题
2. **test**: 在 Node 18.x 和 20.x 上运行完整测试
3. **build-verify**: 构建并验证产物
4. **lint**: 代码格式检查
5. **pack-test**: 验证 npm pack 是否成功

#### Release 工作流 (`.github/workflows/release.yml`)

发布时自动运行:
1. 运行所有测试
2. 构建项目
3. 发布到 npm
4. 创建 GitHub Release

## 验证状态徽章

建议在 README 中添加状态徽章:

```markdown
![CI](https://github.com/elfgzp/aicouncil/workflows/CI/badge.svg)
```

## 故障排除

### Smoke tests 失败
```bash
# 检查依赖
npm ci

# 单独运行 smoke tests
npm run test:smoke
```

### 构建验证失败
```bash
# 重新构建
npm run build

# 运行验证
npm run verify-build
```

### 类型检查失败
```bash
npm run typecheck
```

## 添加新测试

### 添加 Smoke Test
在 `packages/aicouncil-plugin/src/__tests__/smoke/` 目录下创建新的测试文件:

```typescript
import { describe, it, expect } from 'vitest'
import { someFunction } from '../../index'

describe('New Feature Smoke', () => {
  it('should work', () => {
    expect(someFunction()).toBe(true)
  })
})
```

### 添加单元测试
在对应模块旁创建 `.test.ts` 文件:

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from './myModule'

describe('myModule', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expected)
  })
})
```

## 覆盖率报告

生成并查看覆盖率报告:

```bash
npm run test:coverage
```

覆盖率报告会生成在 `coverage/` 目录。

目标覆盖率:
- 核心模块: >90%
- 工具命令: >85%
- 工具函数: >80%
- 整体: >85%
