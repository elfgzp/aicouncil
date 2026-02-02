/**
 * AICouncil OpenCode Plugin
 *
 * Multi-model AI collaborative discussion plugin for OpenCode
 *
 * @packageDocumentation
 */

import { getCouncil } from './core/council'
import { providerAdapter } from './providers/adapter'
import { createAllTools } from './tools'

/**
 * OpenCode plugin default export
 * Converts AICouncil tools to OpenCode format using tool() helper
 */
export default async function AICouncilPlugin(ctx: {
  project: { root: string; name: string }
  client: any
  directory: string
  worktree: string
  $: unknown
}) {
  // Initialize
  getCouncil()
  providerAdapter.setClient(ctx.client)

  // Load OpenCode's tool helper
  let tool: any
  try {
    const mod = await import('@opencode-ai/plugin')
    tool = mod.tool
  } catch {
    return { tool: {} }
  }

  if (!tool) {
    return { tool: {} }
  }

  // Get all tools
  const ourTools = createAllTools()
  const toolHooks: Record<string, any> = {}

  for (const t of ourTools) {
    // Get schema shape from Zod object
    const shape = (t.parameters as any)?.shape || {}
    const args: Record<string, any> = {}

    // Build args using OpenCode's Zod schema
    for (const [key, val] of Object.entries(shape)) {
      const v = val as any
      const type = v._def?.typeName

      if (type === 'ZodString') {
        args[key] = tool.schema.string()
      } else if (type === 'ZodNumber') {
        args[key] = tool.schema.number()
      } else if (type === 'ZodBoolean') {
        args[key] = tool.schema.boolean()
      } else if (type === 'ZodArray') {
        args[key] = tool.schema.array(tool.schema.any())
      } else if (type === 'ZodOptional') {
        args[key] = tool.schema.any().optional()
      } else {
        args[key] = tool.schema.any()
      }

      if (v.description) {
        args[key] = args[key].describe(v.description)
      }
    }

    // Register tool with OpenCode
    toolHooks[t.name] = tool({
      description: t.description,
      args,
      execute: async (input: any) => {
        const result = await t.execute(input)
        return typeof result === 'string' ? result : JSON.stringify(result)
      },
    })
  }

  return { tool: toolHooks }
}
