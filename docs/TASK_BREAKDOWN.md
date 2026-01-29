# AICouncil 开发任务拆分

> 基于文件系统架构的多 AI 讨论组 - Go 实现
>
> 借鉴 Happy CLI 的 SessionScanner 机制，无中间件依赖

## 项目结构

```
aicouncil/
├── cmd/
│   ├── main.go              # 入口
│   ├── discuss.go           # 主命令: 启动讨论组
│   ├── models.go            # 模型管理子命令
│   └── root.go              # 根命令 (Cobra)
├── internal/
│   ├── config/
│   │   ├── config.go        # 配置加载 (Viper)
│   │   ├── selector.go      # 交互式模型选择
│   │   └── presets.go       # 内置预设模型
│   ├── council/
│   │   ├── council.go       # 协调器核心
│   │   ├── message.go       # 消息结构定义
│   │   └── broadcast.go     # 消息广播
│   ├── host/
│   │   ├── host.go          # 主持人管理
│   │   ├── claude.go        # Claude CLI 启动
│   │   └── hook.go          # Hook 配置生成
│   ├── participant/
│   │   ├── participant.go   # 参与者基础结构
│   │   ├── manager.go       # 参与者管理器
│   │   └── filter.go        # 消息过滤 (@提及等)
│   ├── watcher/
│   │   └── watcher.go       # 文件监控 (类似 happy sessionScanner)
│   ├── provider/
│   │   ├── provider.go      # Provider 接口定义
│   │   ├── anthropic.go     # Anthropic API 实现
│   │   ├── openai.go        # OpenAI API 实现
│   │   └── google.go        # Google API 实现 (可选)
│   └── session/
│       ├── session.go       # Session 管理
│       └── storage.go       # 文件存储操作
├── pkg/
│   └── utils/
│       ├── jsonl.go         # JSONL 读写工具
│       └── file.go          # 文件操作工具
├── go.mod
└── README.md
```

---

## 第一阶段：项目骨架

### 任务 1.1: 初始化 Go 项目
**负责人**: -
**预估工时**: 2h
**优先级**: P0

- [ ] 初始化 Go 模块 (`go mod init github.com/yourname/aicouncil`)
- [ ] 创建基础目录结构
- [ ] 配置 go.mod 依赖 (Cobra, Viper, fsnotify)
- [ ] 创建 Makefile (build, test, clean)
- [ ] 创建 .gitignore

**输出文件**:
- `go.mod`
- `go.sum`
- `Makefile`
- `.gitignore`

---

### 任务 1.2: CLI 框架搭建
**负责人**: -
**预估工时**: 3h
**优先级**: P0

- [ ] 创建 Cobra 根命令
- [ ] 创建 `discuss` 子命令
- [ ] 创建 `models` 子命令组
- [ ] 配置全局 flags (--config, --verbose)
- [ ] 实现版本信息 (`--version`)

**输出文件**:
- `cmd/root.go`
- `cmd/discuss.go`
- `cmd/models.go`
- `cmd/main.go`

---

## 第二阶段：配置系统

### 任务 2.1: 配置加载
**负责人**: -
**预估工时**: 4h
**优先级**: P0

- [ ] 定义配置结构体 (参考 TECHNICAL.md)
- [ ] 实现 Viper 配置加载
- [ ] 支持环境变量替换 (`${API_KEY}`)
- [ ] 配置验证 (API Key 格式检查)
- [ ] 创建默认配置生成

**配置结构**:
```go
type Config struct {
    System   SystemConfig   `yaml:"system"`
    Defaults DefaultsConfig `yaml:"defaults"`
    Models   []ModelConfig  `yaml:"models"`
}
```

**输出文件**:
- `internal/config/config.go`
- `config.yaml.example`

---

### 任务 2.2: 预设模型
**负责人**: -
**预估工时**: 2h
**优先级**: P1

- [ ] 定义预设模型列表 (参考 cc-switch)
- [ ] 实现模型查找函数
- [ ] 区分 Provider 类型 (anthropic, openai, google)
- [ ] 支持 Anthropic 兼容服务 (Kimi, MiniMax)

**输出文件**:
- `internal/config/presets.go`

---

### 任务 2.3: 交互式模型选择
**负责人**: -
**预估工时**: 4h
**优先级**: P1

- [ ] 调研 TUI 库 (charmbracelet/bubbletea 或 promptui)
- [ ] 实现模型列表展示
- [ ] 实现多选交互 (空格选择)
- [ ] 实现 "全选" 快捷操作
- [ ] 保存用户选择

**输出文件**:
- `internal/config/selector.go`

---

## 第三阶段：文件系统核心

### 任务 3.1: JSONL 文件操作
**负责人**: -
**预估工时**: 3h
**优先级**: P0

- [ ] 实现 JSONL 追加写入
- [ ] 实现增量读取 (从指定位置)
- [ ] 实现文件锁定 (避免并发写入冲突)
- [ ] 错误处理 (损坏行跳过)

**输出文件**:
- `pkg/utils/jsonl.go`

---

### 任务 3.2: 文件监控器 (核心)
**负责人**: -
**预估工时**: 4h
**优先级**: P0

参考 Happy CLI 的 `sessionScanner`:

- [ ] 实现文件轮询监控
- [ ] 记录读取位置 (类似 `LastReadPos`)
- [ ] 实现变更回调机制
- [ ] 支持优雅关闭
- [ ] 可选: 使用 fsnotify 替代轮询

**输出文件**:
- `internal/watcher/watcher.go`

---

### 任务 3.3: Session 存储
**负责人**: -
**预估工时**: 3h
**优先级**: P0

- [ ] 实现 Session 目录创建
- [ ] 实现 discussion.jsonl 管理
- [ ] 实现 metadata.json 读写
- [ ] 实现历史归档功能
- [ ] 文件权限设置 (0600)

**输出文件**:
- `internal/session/storage.go`
- `internal/session/session.go`

---

## 第四阶段：Provider 实现

### 任务 4.1: Provider 接口定义
**负责人**: -
**预估工时**: 2h
**优先级**: P0

- [ ] 定义 `ProviderClient` 接口
- [ ] 定义消息转换函数
- [ ] 定义错误类型

**接口**:
```go
type ProviderClient interface {
    Complete(ctx context.Context, messages []Message) (string, error)
    Stream(ctx context.Context, messages []Message) (<-chan string, error)
}
```

**输出文件**:
- `internal/provider/provider.go`

---

### 任务 4.2: Anthropic Provider
**负责人**: -
**预估工时**: 4h
**优先级**: P0

- [ ] 实现 HTTP 客户端
- [ ] 支持标准 Anthropic API
- [ ] 支持 Anthropic 兼容 API (Kimi, MiniMax)
- [ ] 处理认证头 (x-api-key vs Bearer)
- [ ] 实现重试机制

**输出文件**:
- `internal/provider/anthropic.go`

---

### 任务 4.3: OpenAI Provider
**负责人**: -
**预估工时**: 3h
**优先级**: P1

- [ ] 实现 HTTP 客户端
- [ ] 支持 GPT-4o, GPT-4o-mini
- [ ] 消息格式转换

**输出文件**:
- `internal/provider/openai.go`

---

### 任务 4.4: Google Provider (可选)
**负责人**: -
**预估工时**: 3h
**优先级**: P2

- [ ] 实现 Gemini API 支持

**输出文件**:
- `internal/provider/google.go`

---

## 第五阶段：核心协调器

### 任务 5.1: 消息结构
**负责人**: -
**预估工时**: 2h
**优先级**: P0

- [ ] 定义 `Message` 结构体
- [ ] 实现消息序列化/反序列化
- [ ] 定义消息类型常量

**输出文件**:
- `internal/council/message.go`

---

### 任务 5.2: 参与者实现 (核心)
**负责人**: -
**预估工时**: 6h
**优先级**: P0

- [ ] 实现 Participant 结构体
- [ ] 实现文件监控循环
- [ ] 实现消息过滤逻辑
- [ ] 实现上下文构建
- [ ] 实现 API 调用
- [ ] 实现响应写入

**关键逻辑**:
```go
func (p *Participant) Run() {
    for {
        messages := p.readNewMessages()
        relevant := p.filterRelevant(messages)  // @提及过滤
        if len(relevant) > 0 {
            response := p.Client.Complete(relevant)
            p.council.Broadcast(response)
        }
        time.Sleep(500 * time.Millisecond)
    }
}
```

**输出文件**:
- `internal/participant/participant.go`
- `internal/participant/filter.go`

---

### 任务 5.3: 参与者管理器
**负责人**: -
**预估工时**: 3h
**优先级**: P0

- [ ] 管理多个参与者生命周期
- [ ] 启动/停止所有参与者
- [ ] 错误处理和重启逻辑
- [ ] 状态监控

**输出文件**:
- `internal/participant/manager.go`

---

### 任务 5.4: 主持人实现 (核心)
**负责人**: -
**预估工时**: 6h
**优先级**: P0

参考 Happy CLI 的 `claudeLocal`:

- [ ] 实现 Host 结构体
- [ ] 实现 Claude CLI 启动 (stdio inherit)
- [ ] 实现 Hook 配置生成 (仅用于获取 session ID)
- [ ] 实现 discussion.jsonl 监控
- [ ] 实现其他 AI 响应显示 (带前缀)

**输出文件**:
- `internal/host/host.go`
- `internal/host/claude.go`
- `internal/host/hook.go`

---

### 任务 5.5: 协调器整合
**负责人**: -
**预估工时**: 4h
**优先级**: P0

- [ ] 实现 Council 结构体
- [ ] 整合 Host 和 Participants
- [ ] 实现消息广播
- [ ] 实现启动流程
- [ ] 实现优雅关闭

**输出文件**:
- `internal/council/council.go`
- `internal/council/broadcast.go`

---

## 第六阶段：CLI 交互

### 任务 6.1: discuss 命令
**负责人**: -
**预估工时**: 4h
**优先级**: P0

- [ ] 实现模型选择流程
- [ ] 实现 Council 初始化
- [ ] 实现信号处理 (Ctrl+C)
- [ ] 实现 `--models` flag
- [ ] 实现 `--all` flag
- [ ] 实现 `--rounds` flag

**输出文件**:
- `cmd/discuss.go`

---

### 任务 6.2: models 命令
**负责人**: -
**预估工时**: 3h
**优先级**: P1

- [ ] 实现 `list` 子命令
- [ ] 实现 `add` 子命令 (交互式)
- [ ] 实现 `remove` 子命令
- [ ] 实现 `enable/disable` 子命令

**输出文件**:
- `cmd/models.go`

---

### 任务 6.3: 讨论组内命令
**负责人**: -
**预估工时**: 4h
**优先级**: P1

- [ ] 实现 `/help` 命令
- [ ] 实现 `/rounds` 命令
- [ ] 实现 `/pause` 和 `/resume` 命令
- [ ] 实现 `/status` 命令
- [ ] 实现 `/exit` 命令

**注意**: 这些命令需要拦截用户输入，在 Host 层处理

**输出文件**:
- `internal/host/commands.go`

---

## 第七阶段：高级功能

### 任务 7.1: 会话恢复
**负责人**: -
**预估工时**: 4h
**优先级**: P1

- [ ] 实现 `--continue` flag
- [ ] 读取历史 discussion.jsonl
- [ ] 恢复参与者状态
- [ ] 实现历史归档

**输出文件**:
- `internal/session/resume.go`

---

### 任务 7.2: @提及机制
**负责人**: -
**预估工时**: 3h
**优先级**: P2

- [ ] 解析消息中的 @提及
- [ ] 定向消息分发
- [ ] 在 UI 中高亮显示

**输出文件**:
- `internal/participant/mention.go`

---

### 任务 7.3: 轮次控制
**负责人**: -
**预估工时**: 3h
**优先级**: P2

- [ ] 实现轮次计数器
- [ ] 自动停止逻辑
- [ ] 手动控制 (/rounds 命令)

**输出文件**:
- `internal/council/rounds.go`

---

## 第八阶段：测试与优化

### 任务 8.1: 单元测试
**负责人**: -
**预估工时**: 8h
**优先级**: P1

- [ ] 配置测试框架
- [ ] 测试配置加载
- [ ] 测试 JSONL 操作
- [ ] 测试消息过滤
- [ ] 测试 Provider 客户端 (mock)

**输出文件**:
- `*_test.go` (各模块)

---

### 任务 8.2: 集成测试
**负责人**: -
**预估工时**: 6h
**优先级**: P1

- [ ] 测试完整启动流程
- [ ] 测试多模型协作
- [ ] 测试文件并发访问
- [ ] 测试错误恢复

**输出文件**:
- `tests/integration_test.go`

---

### 任务 8.3: 性能优化
**负责人**: -
**预估工时**: 4h
**优先级**: P2

- [ ] 优化文件读取性能
- [ ] 减少 API 调用延迟
- [ ] 内存使用优化
- [ ] 添加性能监控

---

## 第九阶段：发布准备

### 任务 9.1: 文档完善
**负责人**: -
**预估工时**: 4h
**优先级**: P1

- [ ] 更新 README.md
- [ ] 编写安装指南
- [ ] 编写使用教程
- [ ] 编写故障排除

---

### 任务 9.2: 发布流程
**负责人**: -
**预估工时**: 3h
**优先级**: P1

- [ ] 配置 GoReleaser
- [ ] 创建 GitHub Actions 工作流
- [ ] 支持多平台构建
- [ ] 创建 Homebrew Formula

**输出文件**:
- `.goreleaser.yml`
- `.github/workflows/release.yml`

---

## 任务依赖图

```
第一阶段: 项目骨架
    │
    ├── 任务 1.1 (Go 项目初始化)
    └── 任务 1.2 (CLI 框架)
            │
            ▼
第二阶段: 配置系统
    │
    ├── 任务 2.1 (配置加载) ─────┐
    ├── 任务 2.2 (预设模型)      │
    └── 任务 2.3 (模型选择)      │
            │                   │
            ▼                   │
第三阶段: 文件系统核心          │
    │                           │
    ├── 任务 3.1 (JSONL 操作)   │
    ├── 任务 3.2 (文件监控)     │
    └── 任务 3.3 (Session 存储) │
            │                   │
            ▼                   │
第四阶段: Provider 实现         │
    │                           │
    ├── 任务 4.1 (接口定义) ◄───┘
    ├── 任务 4.2 (Anthropic)
    ├── 任务 4.3 (OpenAI)
    └── 任务 4.4 (Google-可选)
            │
            ▼
第五阶段: 核心协调器 (关键阶段)
    │
    ├── 任务 5.1 (消息结构)
    ├── 任务 5.2 (参与者实现) ───┐
    ├── 任务 5.3 (参与者管理)    │
    ├── 任务 5.4 (主持人实现)    │
    └── 任务 5.5 (协调器整合)    │
            │                   │
            ▼                   │
第六阶段: CLI 交互              │
    │                           │
    ├── 任务 6.1 (discuss 命令) │
    ├── 任务 6.2 (models 命令)  │
    └── 任务 6.3 (讨论组命令)   │
            │                   │
            ▼                   ▼
第七阶段: 高级功能 ◄────────────┘
    │
    ├── 任务 7.1 (会话恢复)
    ├── 任务 7.2 (@提及)
    └── 任务 7.3 (轮次控制)
            │
            ▼
第八阶段: 测试与优化
    │
    ├── 任务 8.1 (单元测试)
    ├── 任务 8.2 (集成测试)
    └── 任务 8.3 (性能优化)
            │
            ▼
第九阶段: 发布准备
    │
    ├── 任务 9.1 (文档)
    └── 任务 9.2 (发布流程)
```

---

## MVP 版本范围 (前 4 周)

### 必须完成 (P0)

**第 1 周**: 任务 1.1, 1.2, 2.1, 3.1, 3.2
**第 2 周**: 任务 3.3, 4.1, 4.2, 5.1, 5.2
**第 3 周**: 任务 5.3, 5.4, 5.5, 6.1
**第 4 周**: 任务 6.2, 8.1, 集成测试

### MVP 功能

- [ ] 启动多模型讨论组 (Claude + GPT-4o + Kimi)
- [ ] 文件系统消息同步
- [ ] 基本 @提及支持
- [ ] 模型管理命令
- [ ] 单轮讨论模式

### 延后到 V1.0

- [ ] Google Provider
- [ ] 会话恢复 (--continue)
- [ ] 轮次控制
- [ ] 高级讨论组命令

---

## 与旧方案的对比

| 方面 | 旧方案 (Hook HTTP) | 新方案 (文件系统) |
|------|-------------------|------------------|
| 通信机制 | HTTP 服务器 + Hook 转发 | 文件系统 + 轮询 |
| Node.js 依赖 | 需要 | 不需要 |
| 复杂度 | 高 | 低 |
| 可靠性 | 网络依赖 | 本地文件 |
| 扩展性 | 需要修改 Hook | 修改文件格式 |
| 借鉴 Happy | Hook 机制 | SessionScanner |

---

## 开发规范

### 代码规范

- 遵循 Go 官方代码规范
- 使用 `gofmt` 格式化
- 使用 `golint` 检查
- 函数注释使用完整句子

### 提交规范

```
type(scope): subject

body

footer
```

类型: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### 分支策略

- `main`: 稳定分支
- `develop`: 开发分支
- `feature/*`: 功能分支
- `fix/*`: 修复分支
