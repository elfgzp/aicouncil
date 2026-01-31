/**
 * AICouncil OpenCode Plugin
 * 
 * Multi-model AI collaborative discussion plugin for OpenCode
 * 
 * @packageDocumentation
 */

import { z } from 'zod'
import { getCouncil, resetCouncil } from './core/council'
import { providerAdapter } from './providers/adapter'
import { createAllTools } from './tools'
import { setLocale, t } from './i18n'
import type { Locale, DiscussionConfig } from './types'

/**
 * Plugin configuration
 */
export interface AICouncilPluginConfig {
  /** Default locale */
  locale?: Locale
  /** Default max rounds */
  maxRounds?: number
  /** Response timeout in ms */
  responseTimeout?: number
}

/**
 * OpenCode Plugin Input type (from @opencode-ai/plugin)
 */
interface PluginInput {
  client: {
    session: {
      prompt: (options: unknown) => Promise<unknown>
    }
  }
  project: {
    root: string
    name: string
  }
  directory: string
  worktree: string
}

/**
 * Plugin Hook type
 */
type PluginHook = (input: PluginInput) => void | Promise<void>

/**
 * Tool definition type
 */
interface ToolDefinition {
  name: string
  description: string
  parameters: z.ZodType<unknown>
  execute: (input: unknown, context?: unknown) => Promise<unknown>
}

/**
 * Plugin type
 */
interface Plugin {
  name: string
  version: string
  hooks?: {
    'tool'?: (input: PluginInput) => ToolDefinition[]
    [key: string]: PluginHook | ((input: PluginInput) => ToolDefinition[]) | undefined
  }
}

/**
 * Create the AICouncil plugin for OpenCode
 */
export function createAICouncilPlugin(config: AICouncilPluginConfig = {}): Plugin {
  // Set default locale
  if (config.locale) {
    setLocale(config.locale)
  }

  return {
    name: '@aicouncil/opencode-plugin',
    version: '0.1.0',

    hooks: {
      /**
       * Register tools with OpenCode
       */
      'tool': (input: PluginInput) => {
        // Initialize the council with the OpenCode client
        const council = getCouncil({
          maxRounds: config.maxRounds,
          responseTimeout: config.responseTimeout,
          locale: config.locale,
        })

        // Set the client for API calls
        providerAdapter.setClient(input.client as Parameters<typeof providerAdapter.setClient>[0])

        // Return all council tools
        return createAllTools() as ToolDefinition[]
      },
    },
  }
}

// Re-export everything for library usage
export * from './types'
export * from './core'
export * from './providers'
export * from './tools'
export * from './i18n'
export * from './utils'

// OpenCode plugin format
// Export an async function that receives context and returns hooks
export default async function AICouncilPlugin(ctx: {
  project: { root: string; name: string }
  client: Parameters<typeof providerAdapter.setClient>[0]
  directory: string
  worktree: string
  $: unknown
}) {
  // Initialize the council with the OpenCode client
  getCouncil()

  // Set the client for API calls
  providerAdapter.setClient(ctx.client)

  // Get all tools
  const tools = createAllTools()

  // Convert tools to OpenCode format (object with tool name as key)
  const toolHooks: Record<string, unknown> = {}
  for (const tool of tools) {
    toolHooks[tool.name] = tool
  }

  // Return hooks - tool should be an object, not a function
  return {
    tool: toolHooks,
  }
}

