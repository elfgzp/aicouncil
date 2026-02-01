# AICouncil 插件测试

## 测试结构

```
src/__tests__/
├── integration/           # 集成测试
│   └── council.integration.test.ts
├── mocks/                 # Mock 工具
│   └── providers.ts
└── utils/                 # 测试辅助
    └── test-helpers.ts

src/
├── utils/
│   └── index.test.ts     # 与源码放在一起的单元测试
├── core/
│   ├── council.test.ts
│   ├── participant.test.ts
│   └── round.test.ts
├── providers/
│   └── adapter.test.ts
├── i18n/
│   └── index.test.ts
└── tools/
    ├── setup.test.ts
    ├── discuss.test.ts
    ├── status.test.ts
    ├── next.test.ts
    ├── end.test.ts
    └── models.test.ts
```

## 运行测试

```bash
# 运行所有测试
npm test

# 运行并生成覆盖率报告
npm run test:coverage

# 监视模式
npm run test:watch

# 运行特定测试文件
npm test -- src/core/council.test.ts

# 只运行集成测试
npm test -- --testPathPattern=integration
```

## 测试分类

### 单元测试

隔离测试各个模块：

- **Utils**: 辅助函数、事件发射器、重试逻辑
- **Core**: Council 编排、参与者管理、轮次生命周期
- **Providers**: 适配器模式、API 调用、错误处理
- **i18n**: 翻译、语言切换、插值
- **Tools**: 命令验证、执行、输出格式化

### 集成测试

测试完整的工作流程：

- 多轮完整讨论流程
- 错误恢复和重试机制
- 跨操作的状态管理
- 配置处理

## Mock

### Provider 适配器

```typescript
import { providerAdapter } from '../providers/adapter'

vi.mocked(providerAdapter.call).mockResolvedValue({
  content: 'Mock response'
})
```

### Mock 工厂

```typescript
import { createMockParticipant, createMockResponse } from './mocks/providers'

const participant = createMockParticipant({ isHost: true })
const response = createMockResponse('Hello')
```

## 最佳实践

1. **隔离测试**: 在 `beforeEach` 中重置状态
2. **Mock 外部依赖**: 不要调用真实 API
3. **测试边界情况**: 错误、超时、空输入
4. **使用描述性名称**: `it('应该处理超时错误')`
5. **保持测试快速**: 避免使用真实定时器，使用 mock

## 覆盖率目标

- 核心模块: >90%
- 工具: >85%
- 工具函数: >80%
- 整体: >85%
