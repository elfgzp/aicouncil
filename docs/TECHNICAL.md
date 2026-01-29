# AICouncil 技术文档

> 多模型 AI 协作讨论系统 - Go 实现
>
> 基于 Happy CLI 的文件系统架构，实现无中间件的多 AI 讨论组

## 1. 架构概述

### 1.1 核心设计

AICouncil 采用**文件系统作为消息总线**，类似 Happy CLI 的 SessionScanner 机制：

- **主持人（Host）**：前台 Claude CLI 进程，用户直接交互
- **参与者（Participants）**：后台 goroutine，通过文件监控接收消息
- **消息同步**：所有消息写入 `discussion.jsonl`，参与者轮询读取

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户终端                                  │
│  $ aicouncil discuss --models claude,gpt-4o,kimi                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AICouncil (Go)                               │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ CLI 命令     │  │ 协调器       │  │ 文件监控器         │    │
│  │ (Cobra)     │  │ (Council)   │  │ (FileWatcher)     │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
└──────────┬────────────────┬─────────────────────────────────────┘
           │                │
           │    ┌───────────┴───────────┐
           │    ▼                       ▼
           │ ┌────────┐            ┌────────┐
           │ │Host    │            │Participant
           │ │Claude  │            │Manager │
           │ │(前台)  │            │(后台)  │
           │ └───┬────┘            └───┬────┘
           │     │                     │
           │     │            ┌────────┼────────┐
           │     │            ▼        ▼        ▼
           │     │        ┌──────┐ ┌──────┐ ┌──────┐
           │     │        │Claude│ │GPT-4o│ │Kimi  │
           │     │        │#2    │ │      │ │      │
           │     │        └──────┘ └──────┘ └──────┘
           │     │
           ▼     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    共享存储 (~/.aicouncil/)                      │
│  sessions/live/discussion.jsonl  <- 所有消息（用户+AI）          │
│  sessions/live/claude-2.json     <- Claude #2 输出               │
│  sessions/live/gpt-4o.json       <- GPT-4o 输出                  │
│  sessions/live/kimi.json         <- Kimi 输出                    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 角色定义

| 角色 | 进程类型 | 输入来源 | 输出目标 | 技术实现 |
|------|----------|----------|----------|----------|
| **Host** (主持人) | 前台 | 用户 stdin | 用户 stdout | Claude CLI spawn |
| **Participant** (参与者) | 后台 | discussion.jsonl | 自身 json 文件 | Go HTTP Client + FileWatcher |

### 1.3 消息流转

```
用户输入 → Host Claude → 写入 discussion.jsonl
                              ↓
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
              Participant Participant Participant
              (监控文件)  (监控文件)  (监控文件)
                    │         │         │
                    ▼         ▼         ▼
              调用 API    调用 API    调用 API
                    │         │         │
                    ▼         ▼         ▼
              写入各自   写入各自   写入各自
              输出文件   输出文件   输出文件
```

## 2. 核心组件

### 2.1 协调器 (Council)

```go
// internal/council/council.go
type Council struct {
    SessionDir    string              // ~/.aicouncil/sessions/live/
    Host          *Host               // 主持人
    Participants  []*Participant      // 参与者列表
    Watcher       *FileWatcher        // 文件监控
    MessageBus    chan Message        // 内部消息通道
}

type Message struct {
    ID        string    `json:"id"`
    From      string    `json:"from"`      // user, claude-1, gpt-4o, kimi
    Type      string    `json:"type"`      // user, assistant, system
    Content   string    `json:"content"`
    Timestamp time.Time `json:"timestamp"`
    ReplyTo   string    `json:"reply_to,omitempty"` // @提及支持
}

func (c *Council) Start() error {
    // 1. 创建 session 目录
    // 2. 启动参与者（后台 goroutine）
    // 3. 启动主持人（阻塞）
}

func (c *Council) Broadcast(msg Message) {
    // 写入 discussion.jsonl
    // 所有参与者通过文件监控接收
}
```

### 2.2 主持人 (Host)

参考 Happy CLI 的 `claudeLocal`：

```go
// internal/host/host.go
type Host struct {
    Model       ModelConfig
    SessionDir  string
    Cmd         *exec.Cmd
}

func (h *Host) Run() error {
    // 类似 happy 的 claudeLocal
    args := []string{
        "--session-dir", h.SessionDir,
        "--settings", generateHookSettings(), // 用于捕获 session ID
    }

    cmd := exec.Command("claude", args...)
    cmd.Stdin = os.Stdin      // 用户直接输入
    cmd.Stdout = os.Stdout    // 用户直接看到输出
    cmd.Stderr = os.Stderr

    // 启动 goroutine 监控 discussion.jsonl
    // 当其他 AI 有响应时，以 [claude-2] 前缀显示

    return cmd.Run()
}
```

### 2.3 参与者 (Participant)

参考 Happy CLI 的 `sessionScanner`：

```go
// internal/participant/participant.go
type Participant struct {
    ID           string
    Model        ModelConfig
    SessionDir   string
    Client       ProviderClient  // Anthropic/OpenAI/Google client
    LastReadPos  int64           // 文件读取位置
}

func (p *Participant) Run() {
    discussionFile := filepath.Join(p.SessionDir, "discussion.jsonl")

    for {
        // 1. 读取新消息（类似 happy 的 SessionScanner）
        messages, newPos := p.readNewMessages(discussionFile)

        // 2. 过滤：排除自己的消息，检查是否 @我
        relevant := p.filterRelevant(messages)

        if len(relevant) > 0 {
            // 3. 构建上下文（讨论历史）
            context := p.buildContext(relevant)

            // 4. 调用 AI API
            response := p.Client.Complete(context)

            // 5. 写入自己的输出文件
            p.writeResponse(response)

            // 6. 追加到 discussion.jsonl（通过协调器）
            p.council.Broadcast(Message{
                From:    p.ID,
                Content: response,
            })
        }

        time.Sleep(500 * time.Millisecond) // 轮询间隔
    }
}
```

### 2.4 文件监控 (FileWatcher)

参考 Happy CLI 的 `sessionScanner`：

```go
// internal/watcher/watcher.go
type FileWatcher struct {
    FilePath string
    Callback func(line string)
    Position int64
}

func (w *FileWatcher) Start() {
    // 类似 happy 的 sessionScanner
    // 使用 fsnotify 或轮询

    for {
        file, _ := os.Open(w.FilePath)
        file.Seek(w.Position, 0)

        scanner := bufio.NewScanner(file)
        for scanner.Scan() {
            line := scanner.Text()
            w.Callback(line)
            w.Position += int64(len(line)) + 1
        }

        file.Close()
        time.Sleep(200 * time.Millisecond)
    }
}
```

## 3. 存储格式

### 3.1 discussion.jsonl

```jsonl
{"id":"msg-001","from":"user","type":"user","content":"帮我设计一个 API","timestamp":"2024-01-29T10:00:00Z"}
{"id":"msg-002","from":"claude-1","type":"assistant","content":"我建议使用 RESTful 设计...","timestamp":"2024-01-29T10:00:05Z"}
{"id":"msg-003","from":"gpt-4o","type":"assistant","content":"补充一点，数据库层面可以考虑...","timestamp":"2024-01-29T10:00:08Z","reply_to":"msg-002"}
{"id":"msg-004","from":"kimi","type":"assistant","content":"考虑到性能，建议用 gRPC...","timestamp":"2024-01-29T10:00:10Z"}
```

### 3.2 目录结构

```
~/.aicouncil/
├── config.yaml                  # 用户配置
├── sessions/
│   └── live/                    # 当前讨论（软链接或固定路径）
│       ├── discussion.jsonl     # 主消息流
│       ├── metadata.json        # 讨论元数据
│       └── participants/
│           ├── claude-1.json    # 主持人输出备份
│           ├── claude-2.json    # 参与者 2 输出
│           ├── gpt-4o.json      # GPT-4o 输出
│           └── kimi.json        # Kimi 输出
└── history/                     # 历史讨论归档
    └── 2024-01-29-10-00-00/
        └── ...
```

## 4. Provider 实现

### 4.1 统一接口

```go
// internal/provider/provider.go
type ProviderClient interface {
    Complete(ctx context.Context, messages []Message) (string, error)
    Stream(ctx context.Context, messages []Message) (<-chan string, error)
}

type ModelConfig struct {
    ID       string `yaml:"id"`
    Name     string `yaml:"name"`
    Provider string `yaml:"provider"` // anthropic, openai, google
    APIKey   string `yaml:"api_key"`
    BaseURL  string `yaml:"base_url,omitempty"`
}
```

### 4.2 Claude Provider (Anthropic API)

```go
// internal/provider/anthropic.go
type AnthropicClient struct {
    APIKey  string
    BaseURL string
    Model   string
}

func (c *AnthropicClient) Complete(ctx context.Context, messages []Message) (string, error) {
    // 使用 anthropic-go SDK 或原生 HTTP
    req := &MessagesRequest{
        Model:    c.Model,
        Messages: convertMessages(messages),
        MaxTokens: 4000,
    }
    // ...
}
```

### 4.3 OpenAI Provider

```go
// internal/provider/openai.go
type OpenAIClient struct {
    APIKey string
}

func (c *OpenAIClient) Complete(ctx context.Context, messages []Message) (string, error) {
    // 使用 openai-go 或原生 HTTP
}
```

### 4.4 预设模型

内置配置（参考 cc-switch）：

```go
// internal/provider/presets.go
var PresetModels = []ModelConfig{
    {ID: "claude-sonnet-4", Name: "Claude Sonnet 4", Provider: "anthropic"},
    {ID: "claude-haiku-4", Name: "Claude Haiku 4", Provider: "anthropic"},
    {ID: "gpt-4o", Name: "GPT-4o", Provider: "openai"},
    {ID: "gpt-4o-mini", Name: "GPT-4o Mini", Provider: "openai"},
    {ID: "kimi-k2", Name: "Kimi K2", Provider: "anthropic", BaseURL: "https://api.kimi.com/coding/v1"},
    {ID: "minimax-m2.1", Name: "MiniMax M2.1", Provider: "anthropic", BaseURL: "https://api.minimaxi.com/anthropic/v1"},
}
```

## 5. 交互流程

### 5.1 启动流程

```go
func main() {
    // 1. 加载配置
    config := loadConfig()

    // 2. 选择模型（交互式）
    models := selectModels(config)

    // 3. 创建协调器
    council := council.New(models)

    // 4. 启动
    council.Start() // 阻塞直到用户退出
}
```

### 5.2 消息处理流程

```
用户输入: "如何设计一个高效的缓存系统？"
    ↓
Host Claude 接收 → 显示给用户 + 写入 discussion.jsonl
    ↓
FileWatcher 触发所有 Participants
    ↓
各 Participant 读取消息 → 调用 API
    ↓
各 AI 响应写入自己的文件 + 追加到 discussion.jsonl
    ↓
Host 监控 discussion.jsonl → 以 [gpt-4o] [kimi] 前缀显示
```

### 5.3 @提及机制

```go
func (p *Participant) filterRelevant(messages []Message) []Message {
    var relevant []Message

    for _, msg := range messages {
        // 条件1：用户消息（所有人处理）
        if msg.From == "user" {
            relevant = append(relevant, msg)
            continue
        }

        // 条件2：@提及我
        if strings.Contains(msg.Content, "@"+p.ID) {
            relevant = append(relevant, msg)
            continue
        }

        // 条件3：直接回复我
        if msg.ReplyTo != "" && isMyMessage(msg.ReplyTo) {
            relevant = append(relevant, msg)
        }
    }

    return relevant
}
```

## 6. CLI 设计

### 6.1 命令结构

```bash
# 启动讨论（交互式选择模型）
aicouncil discuss

# 指定模型
aicouncil discuss --models claude-sonnet,gpt-4o

# 使用所有已启用模型
aicouncil discuss --all

# 限制轮次（单轮讨论）
aicouncil discuss --rounds 1

# 继续上次讨论
aicouncil discuss --continue

# 模型管理
aicouncil models list              # 列出已配置模型
aicouncil models add               # 交互式添加
aicouncil models remove <id>       # 移除模型
```

### 6.2 交互界面

```
$ aicouncil discuss

选择参与讨论的模型（空格选择，回车确认）：
  [x] 1. Claude Sonnet 4 (anthropic)
  [x] 2. GPT-4o (openai)
  [ ] 3. Kimi K2 (anthropic-compat)
  [x] 4. Claude Haiku 4 (anthropic)

启动 4 个模型的讨论组...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[讨论组] 输入你的问题，或 /help 查看命令

You: 如何设计一个高并发订单系统？

[claude-1] 我建议采用事件驱动架构...

[gpt-4o] 补充一点，数据库层面可以考虑...

[kimi] 我同意 @claude-1 的观点，同时...

[claude-2] 关于性能优化，还可以...

You:
```

### 6.3 讨论组内命令

```
/help          显示帮助
/rounds N      设置剩余讨论轮次
/pause         暂停其他 AI 参与
/resume        恢复
/status        显示当前参与者状态
/save          保存当前讨论
/exit          退出讨论组
```

## 7. 配置

### 7.1 配置文件

```yaml
# ~/.aicouncil/config.yaml
version: "1.0"

system:
  log_level: info
  session_dir: "~/.aicouncil/sessions"
  poll_interval: 500ms  # 文件轮询间隔

defaults:
  max_rounds: 3
  timeout: 60s

models:
  - id: claude-sonnet
    name: Claude Sonnet
    provider: anthropic
    api_key: ${ANTHROPIC_API_KEY}
    enabled: true

  - id: gpt-4o
    name: GPT-4o
    provider: openai
    api_key: ${OPENAI_API_KEY}
    enabled: true

  - id: kimi-k2
    name: Kimi K2
    provider: anthropic
    base_url: https://api.kimi.com/coding/v1
    api_key: ${KIMI_API_KEY}
    enabled: false
```

## 8. 技术选型

| 组件 | 选择 | 理由 |
|------|------|------|
| 语言 | Go 1.21+ | 高性能、并发支持、单二进制部署 |
| CLI | Cobra | 成熟、子命令支持好 |
| 配置 | Viper | 支持多格式、环境变量 |
| HTTP 客户端 | net/http | 标准库，无依赖 |
| 文件监控 | fsnotify | 跨平台文件事件通知 |
| JSONL | bufio.Scanner | 标准库，流式处理 |

## 9. 参考实现

### 9.1 Happy CLI 借鉴点

| 功能 | Happy 实现 | AICouncil 借鉴 |
|------|-----------|----------------|
| 本地模式 | `claudeLocal` - spawn + stdio inherit | Host 使用相同方式 |
| Session 监控 | `sessionScanner` - 读取 jsonl | Participant 使用类似机制 |
| Hook | `generateHookSettings` + `startHookServer` | 仅用于获取 session ID |
| 消息队列 | `MessageQueue2` | 改为文件系统队列 |

### 9.2 关键差异

| 方面 | Happy | AICouncil |
|------|-------|-----------|
| 目标 | 远程控制 Claude | 多 AI 协作讨论 |
| 架构 | 本地 ↔ 远程切换 | 固定多模型 |
| 通信 | WebSocket + API | 文件系统 |
| 存储 | 服务端 SQLite | 本地文件 |

## 10. 错误处理

### 10.1 故障恢复

```go
// Participant 重连逻辑
func (p *Participant) RunWithRetry() {
    for {
        err := p.Run()
        if err != nil {
            log.Printf("%s error: %v, retrying in 5s...", p.ID, err)
            time.Sleep(5 * time.Second)
        }
    }
}
```

### 10.2 API 超时

```go
ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
defer cancel()

response, err := client.Complete(ctx, messages)
```

## 11. 安全考虑

1. **API Key 存储**：使用系统 keychain 或环境变量，不硬编码
2. **日志脱敏**：自动过滤 API Key
3. **文件权限**：session 文件设置 0600
4. **路径安全**：限制 AI 可访问的目录范围

## 12. 性能优化

1. **文件读取**：使用 bufio.Scanner，避免一次性加载大文件
2. **并发控制**：每个 Participant 一个 goroutine
3. **上下文缓存**：减少重复读取文件
4. **增量更新**：只读取新增内容
