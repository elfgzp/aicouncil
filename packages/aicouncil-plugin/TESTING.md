# AICouncil Plugin Testing Guide

## 环境要求

本项目使用 **Bun** 作为包管理器和运行时：

```bash
# 安装 Bun (如果还没有安装)
curl -fsSL https://bun.sh/install | bash
```

## 安装依赖

```bash
# 使用 Bun (推荐)
bun install

# 或使用 npm (备用)
npm install
```

## 运行测试

### 使用 Bun (推荐)

```bash
# 运行所有测试
bun test

# 运行测试并生成覆盖率报告
bun run test:coverage

# 监视模式 (开发时使用)
bun run test:watch

# 运行特定测试文件
bun test src/core/council.test.ts
```

### 使用 npm (备用)

如果环境中没有 Bun，可以使用 npm：

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监视模式
npm run test:watch
```

## 测试结构

```
src/
├── __tests__/
│   ├── integration/         # 集成测试
│   │   └── council.integration.test.ts
│   ├── mocks/              # Mock 工具
│   │   └── providers.ts
│   ├── utils/              # 测试辅助
│   │   └── test-helpers.ts
│   └── README.md           # 测试文档
├── core/
│   ├── council.test.ts     # Council 核心测试
│   ├── participant.test.ts # 参与者管理测试
│   └── round.test.ts       # 轮次管理测试
├── providers/
│   └── adapter.test.ts     # Provider 适配器测试
├── i18n/
│   └── index.test.ts       # 国际化测试
├── tools/
│   ├── setup.test.ts       # 设置命令测试
│   ├── discuss.test.ts     # 讨论命令测试
│   ├── status.test.ts      # 状态命令测试
│   ├── next.test.ts        # 下一轮命令测试
│   ├── end.test.ts         # 结束命令测试
│   └── models.test.ts      # 模型列表测试
└── utils/
    └── index.test.ts       # 工具函数测试
```

## 测试覆盖率

目标覆盖率：
- 核心模块: >90%
- 工具命令: >85%
- 工具函数: >80%
- 整体: >85%

## 编写测试

### 单元测试示例

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createParticipant } from './participant'

describe('createParticipant', () => {
  it('should create participant with default options', () => {
    const participant = createParticipant(mockProvider)
    expect(participant.name).toBe('Test Provider')
    expect(participant.isHost).toBe(false)
  })
})
```

### Mock Provider

```typescript
import { vi } from 'vitest'
import { providerAdapter } from '../providers/adapter'

vi.mock('../providers/adapter', () => ({
  providerAdapter: {
    setClient: vi.fn(),
    call: vi.fn().mockResolvedValue({ content: 'Mock response' }),
  },
}))
```

### 使用 Mock 工厂

```typescript
import { createMockParticipant, createMockResponse } from '../__tests__/mocks/providers'

const participant = createMockParticipant({ isHost: true })
const response = createMockResponse('Hello')
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run type check
        run: bun run typecheck

      - name: Run tests
        run: bun test

      - name: Generate coverage
        run: bun run test:coverage
```

## 故障排除

### 测试运行缓慢

- 使用 `--reporter=dot` 减少输出
- 使用 `--testNamePattern` 运行特定测试

### Mock 不工作

- 确保使用 `vi.mock()` 在文件顶部
- 检查 `vi.clearAllMocks()` 在 `beforeEach`

### 类型错误

- 运行 `bun run typecheck` 检查类型
- 确保测试文件有正确的类型导入

## 真实 API 集成测试

这些测试使用真实的 Kimi 和 MiniMax API 进行端到端测试。

### 配置环境变量

确保在 `.zshrc` 或 `.bashrc` 中设置了 API keys：

```bash
export KIMI_API_KEY="your-kimi-api-key"
export MINIMAX_API_KEY="your-minimax-api-key"
```

### 运行真实 API 测试

```bash
# 使用交互式脚本（推荐）
bun run test:real-api

# 或直接运行
bun run test:integration

# 运行特定测试
bun test src/__tests__/integration/real-api.test.ts
```

### 测试内容

真实 API 测试包括：

1. **单轮讨论** - Kimi 和 MiniMax 就技术话题进行讨论
2. **多轮讨论** - 验证上下文保持能力
3. **中文讨论** - 测试中文语言支持
4. **错误处理** - 测试无效 API key 的处理
5. **不同话题** - 数据库、API 设计、代码审查等话题

### 注意事项

- 真实 API 测试会消耗 API tokens
- 每次测试运行大约消耗 2-4k tokens
- 测试有较长的超时时间（60-180 秒）
- 如果 API 服务不可用，测试会失败

### 跳过真实 API 测试

在 CI/CD 环境中，可以只运行单元测试：

```bash
# 只运行单元测试（不包含真实 API 测试）
bun test --exclude="**/real-api.test.ts"
```
