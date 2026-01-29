# AICouncil - 多模型 AI 协作讨论工具

> 在本地启动多个 AI 模型进程，让它们协同参与同一个讨论会话

## 功能特性

- **多模型协作**：多个 AI 模型进程参与同一个讨论会话
- **主持人模式**：第一个模型在前台与用户交互，其他模型在后台
- **上下文共享**：所有模型可读取彼此的思考过程和响应
- **参数透传**：Claude/Codex 原生命令参数直接传递
- **预设模型**：内置常用模型配置，只需输入 API Key（参考 cc-switch）
- **会话延续**：复用 Claude/Codex 原生会话机制

## 安装

### 前置依赖

- Go 1.21+
- Claude CLI 已安装 (`npm install -g @anthropic-ai/claude-cli`)
- (可选) Codex CLI 已安装 (`npm install -g @openai/codex`)

### 安装方式

```bash
# 方式1：直接安装
go install github.com/yourusername/aicouncil@latest

# 方式2：从源码构建
git clone https://github.com/yourusername/aicouncil.git
cd aicouncil
go build -o aicouncil
sudo mv aicouncil /usr/local/bin/
```

### 环境变量配置

```bash
# Anthropic
export ANTHROPIC_API_KEY=your_anthropic_key

# OpenAI (可选)
export OPENAI_API_KEY=your_openai_key

# MiniMax (可选)
export MINIMAX_API_KEY=your_minimax_key

# Kimi (可选)
export KIMI_API_KEY=your_kimi_key
```

## 快速开始

```bash
# 1. 确保 Claude CLI 已登录
claude login

# 2. 启动讨论组（首次使用会提示选择模型）
aicouncil claude

# 3. 输入讨论主题，多个模型会协同响应

# 4. 继续上一会话
aicouncil claude --continue
```

## 使用方法

**重要**：aicouncil 直接将所有参数传递给 Claude/Codex，使用 Claude 的原生参数。

```bash
# 启动 Claude 讨论组（交互式选择模型）
aicouncil claude

# 继续上一会话（Claude 自己处理）
aicouncil claude --continue
aicouncil claude -r

# 恢复特定会话
aicouncil claude --resume <session-id>

# Claude 原生参数直接使用
aicouncil claude -m sonnet          # 选择模型
aicouncil claude --help             # Claude 帮助

# 启动 Codex 讨论组
aicouncil codex
aicouncil codex --continue          # Codex 处理继续

# 交互式添加模型
aicouncil add-model

# 列出已配置的模型
aicouncil models list

# 列出所有预设模型
aicouncil preset list
```

## 设计原则

```
aicouncil claude --continue
         ↓ 直接透传，不做任何解释
    claude --continue  ← Claude 自己处理会话逻辑
```

aicouncil 监控 Claude 输出检测会话状态，然后启动其他模型进程。

## 模型选择示例

```
$ aicouncil claude

选择参与讨论的模型：
（直接回车选择全部，或输入编号，用逗号分隔）

  [*] 1. Claude Sonnet 4 (anthropic)
  [*] 2. Claude Haiku 4 (anthropic)
  [ ] 3. GPT-4o (openai)
  [ ] 4. Gemini 2.5 Pro (google)

您的选择: 1,2

启动 2 个模型的讨论...
```

## 添加模型

参考 cc-switch 提供预设 Provider。aicouncil 采用类似方式。

### 快速添加（选择预设）

```
$ aicouncil add-model

可用的预设模型：

[ANTHROPIC - 官方]
  1. Claude Sonnet 4
  2. Claude Haiku 4
  3. Claude Opus 4

[ANTHROPIC - 中文兼容]
  4. MiniMax M2.1
  5. Kimi K2
  6. Moonshot K2

[OPENAI]
  7. GPT-4o
  8. GPT-4o Mini
  9. o1
 10. o3-mini

[GOOGLE]
 11. Gemini 2.5 Pro
 12. Gemini 2.5 Flash

[自定义]
 13. 自定义模型...

输入编号或 'c' 自定义: 4

已选择：MiniMax M2.1（Anthropic 兼容，仅 Bearer 认证）
API Key（或环境变量）: ${MINIMAX_API_KEY}

模型添加成功！
```

### 自定义模型

```
输入编号或 'c' 自定义: c

--- 自定义模型配置 ---
Model ID: my-model
Model 显示名称: My Custom Model
Provider 类型: custom
API Base URL: https://api.my-service.com/v1
API Key: ${MY_API_KEY}

模型添加成功！
```

## 架构

详见 [TECHNICAL.md](docs/TECHNICAL.md) 了解详细架构设计。

```
┌─────────────────────────────────────────────────────────────────┐
│                     AICouncil CLI (Go)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  参数解析    │  │  配置加载    │  │  进程管理器        │    │
│  │  (Cobra)    │  │  (YAML)     │  │  (goroutine)      │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ Claude #1   │ │ Claude #2   │ │ Claude #N   │
    │ (主持人)    │ │ (参与者)    │ │ (参与者)    │
    │ 交互式      │ │ 后台        │ │ 后台        │
    └─────────────┘ └─────────────┘ └─────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      协调器                                       │
│  - 消息路由 | 讨论状态 | 轮次控制                                │
└─────────────────────────────────────────────────────────────────┘
```

## 配置

### 配置目录

```
~/.aicouncil/
├── config.yaml           # 主配置
├── providers/            # Provider 配置
│   ├── anthropic.yaml
│   ├── openai.yaml
│   └── google.yaml
├── sessions/             # 会话历史
└── logs/                 # 日志文件
```

### 主配置

```yaml
# ~/.aicouncil/config.yaml
system:
  log_level: info
  log_dir: ~/.aicouncil/logs

defaults:
  models:
    - id: claude-sonnet-4-20250514
      provider: anthropic
      enabled: true
```

### Provider 配置示例

```yaml
# ~/.aicouncil/providers/anthropic.yaml
provider:
  name: Anthropic
  base_url: https://api.anthropic.com
  transport: http
  auth_mode: anthropic

models:
  - id: claude-sonnet-4-20250514
    name: Claude Sonnet 4
    api_key: ${ANTHROPIC_API_KEY}
    max_tokens: 4000
```

更多配置示例详见 [TECHNICAL.md](docs/TECHNICAL.md)。

## 故障排除

### 问题：aicouncil 命令未找到

**解决方案**：
```bash
# 检查 go bin 目录是否在 PATH 中
export PATH=$PATH:$(go env GOPATH)/bin

# 或手动移动二进制文件
sudo mv aicouncil /usr/local/bin/
```

### 问题：Claude CLI 未安装

**解决方案**：
```bash
npm install -g @anthropic-ai/claude-cli
claude login
```

### 问题：API Key 无效

**解决方案**：
```bash
# 检查环境变量是否设置
echo $ANTHROPIC_API_KEY

# 或直接在配置文件中设置（不推荐用于生产环境）
# ~/.aicouncil/providers/anthropic.yaml
models:
  - id: claude-sonnet-4-20250514
    api_key: sk-ant-xxxxx  # 直接填写
```

### 问题：模型无法连接

**解决方案**：
1. 检查网络连接
2. 验证 Base URL 是否正确
3. 检查防火墙设置
4. 查看日志：`tail -f ~/.aicouncil/logs/aicouncil.log`

## 参考项目

### Happy CLI (https://github.com/slopus/happy)

**参考内容**：Claude Code Hook 机制集成、进程包装与进程间通信

### cc-switch (https://github.com/farion1231/cc-switch)

**参考内容**：多 Provider 配置管理、Anthropic 兼容协议认证模式

## 许可证

MIT
