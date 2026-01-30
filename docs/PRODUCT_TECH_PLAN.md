# AICouncil 产品技术方案

## 产品概述

AICouncil 是一个 OpenCode 插件，实现多模型 AI 协作讨论功能。

## 核心需求

1. **多模型协作** - 支持 Kimi、MiniMax、Claude、GPT-4o 等多个模型参与同一讨论
2. **主持人机制** - 一个模型作为主持人，控制讨论流程
3. **轮次管理** - 结构化的讨论轮次，每轮所有参与者发言
4. **MCP/Skills 支持** - 完全兼容 OpenCode 的 MCP 和 Skills 系统
5. **国际化** - 支持中英文界面和提示词

## 技术架构

### 插件结构

```
@aicouncil/opencode-plugin/
├── src/
│   ├── index.ts              # 插件入口
│   ├── core/
│   │   ├── council.ts        # 讨论组核心逻辑
│   │   ├── participant.ts    # 参与者管理
│   │   └── round.ts          # 轮次管理
│   ├── providers/
│   │   └── adapter.ts        # Provider 适配器
│   ├── tools/
│   │   ├── setup.ts          # /council_setup 命令
│   │   ├── discuss.ts        # /council_discuss 命令
│   │   ├── status.ts         # /council_status 命令
│   │   ├── models.ts         # /council_models 命令
│   │   ├── end.ts            # /council_end 命令
│   │   └── next.ts           # /council_next 命令
│   ├── i18n/
│   │   ├── index.ts          # 国际化入口
│   │   ├── en.ts             # 英文
│   │   └── zh.ts             # 简体中文
│   ├── types/
│   │   └── index.ts          # 类型定义
│   └── utils/
│       └── index.ts          # 工具函数
```

### 数据流

```
用户输入 → OpenCode → AICouncil Plugin → Provider Adapter → 各模型 API
                                ↓
                         Council 状态管理
                                ↓
                         OpenCode TUI 展示
```

### Provider 配置

支持通过 OpenCode 配置文件添加自定义 Provider：

```json
{
  "provider": {
    "kimi": {
      "options": {
        "baseURL": "https://api.kimi.com/coding/",
        "apiKey": "sk-xxx"
      },
      "models": {
        "kimi-for-coding": {
          "name": "Kimi For Coding"
        }
      }
    },
    "minimax": {
      "options": {
        "baseURL": "https://api.minimaxi.com/anthropic",
        "apiKey": "jwt-token"
      },
      "models": {
        "MiniMax-M2.1": {
          "name": "MiniMax M2.1"
        }
      }
    }
  }
}
```

## 使用流程

### 1. 设置讨论组

```
/council_setup models=[
  {"providerId": "minimax", "isHost": true, "name": "主持人"},
  {"providerId": "kimi", "name": "Kimi"}
]
```

### 2. 开始讨论

```
/council_discuss topic="如何设计高可用系统？"
```

### 3. 查看状态

```
/council_status includeMessages=true
```

### 4. 继续下一轮

```
/council_next
```

### 5. 结束讨论

```
/council_end generateSummary=true
```

## 国际化设计

所有用户可见的文本都通过 i18n 模块管理：

- 命令描述
- 状态消息
- 错误提示
- LLM 提示词

支持的语言：
- English (en)
- 简体中文 (zh)
- 繁体中文 (zh-TW) - 计划中
- 日本語 (ja) - 计划中
- 한국어 (ko) - 计划中

## 优势

1. **单实例运行** - 不需要启动多个 CLI 进程
2. **原生集成** - 完全利用 OpenCode 的 Provider 和 SDK
3. **MCP 支持** - 讨论中可以使用 MCP 工具
4. **Skills 支持** - 可以加载项目的 Skills
5. **简单配置** - 通过 OpenCode 配置文件管理 Provider
