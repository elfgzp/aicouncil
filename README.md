# AICouncil

Multi-model AI collaborative discussion plugin for [OpenCode](https://github.com/sst/opencode).

## Overview

AICouncil enables multiple AI models to participate in collaborative discussions within OpenCode. It supports:

- **Multi-model discussions** - Kimi, MiniMax, Claude, GPT-4o, and more
- **Host-participant architecture** - One model hosts, others participate
- **Round-based discussions** - Structured conversation flow
- **MCP & Skills support** - Full compatibility with OpenCode's MCP and Skills
- **Internationalization** - English and Chinese support

## Installation

```bash
# In your OpenCode project
bun add @aicouncil/opencode-plugin
```

## Configuration

### OpenCode Config

Add the plugin to your OpenCode configuration:

```json
// ~/.opencode/config.json
{
  "plugins": ["@aicouncil/opencode-plugin"],
  "provider": {
    "kimi": {
      "options": {
        "baseURL": "https://api.kimi.com/coding/",
        "apiKey": "your-kimi-api-key"
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
        "apiKey": "your-minimax-jwt-token"
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

## Usage

### 1. Set up a Council

```
/council_setup models=[
  {"providerId": "minimax", "isHost": true},
  {"providerId": "kimi"}
]
```

### 2. Start a Discussion

```
/council_discuss topic="How should we design a high-availability system?"
```

### 3. Continue to Next Round

```
/council_next
```

### 4. Check Status

```
/council_status includeMessages=true
```

### 5. End Discussion

```
/council_end generateSummary=true
```

## Available Commands

| Command | Description |
|---------|-------------|
| `council_setup` | Set up a multi-model discussion council |
| `council_discuss` | Start a discussion with the configured council |
| `council_status` | Show current council status |
| `council_models` | List available models |
| `council_next` | Proceed to the next round |
| `council_end` | End the current discussion |

## Supported Providers

| Provider | Models | API Compatibility |
|----------|--------|-------------------|
| Kimi | kimi-for-coding | Anthropic |
| MiniMax | MiniMax-M2.1 | Anthropic |
| Anthropic | Claude models | Native |
| OpenAI | GPT-4o, etc. | Native |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     OpenCode TUI                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  /council_setup → /council_discuss → /council_next      │    │
│  │                                                          │    │
│  │  🎤 [Host: MiniMax] Opening remarks...                   │    │
│  │  💬 [Kimi] My perspective is...                          │    │
│  │  🎤 [Host: MiniMax] Summarizing round 1...               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  AICouncil Plugin                                        │    │
│  │  ├── Council (orchestration)                             │    │
│  │  ├── ParticipantManager                                  │    │
│  │  ├── RoundManager                                        │    │
│  │  └── ProviderAdapter → OpenCode SDK                      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Development

```bash
# Install dependencies
cd packages/aicouncil-plugin
bun install

# Build
bun run build

# Type check
bun run typecheck

# Run tests
bun run test
```

## License

MIT
