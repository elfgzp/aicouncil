/**
 * Tools Module
 * 
 * Exports all council tools for the OpenCode plugin
 */

import { createSetupTool, executeSetup, setupInputSchema, type SetupInput, type SetupOutput } from './setup'
import { createDiscussTool, executeDiscuss, discussInputSchema, type DiscussInput, type DiscussOutput } from './discuss'
import { createStatusTool, executeStatus, statusInputSchema, type StatusInput, type StatusOutput } from './status'
import { createModelsTool, executeModels, modelsInputSchema, type ModelsInput, type ModelsOutput } from './models'
import { createEndTool, executeEnd, endInputSchema, type EndInput, type EndOutput } from './end'
import { createNextTool, executeNext, nextInputSchema, type NextInput, type NextOutput } from './next'

// Re-export everything
export { createSetupTool, executeSetup, setupInputSchema, type SetupInput, type SetupOutput }
export { createDiscussTool, executeDiscuss, discussInputSchema, type DiscussInput, type DiscussOutput }
export { createStatusTool, executeStatus, statusInputSchema, type StatusInput, type StatusOutput }
export { createModelsTool, executeModels, modelsInputSchema, type ModelsInput, type ModelsOutput }
export { createEndTool, executeEnd, endInputSchema, type EndInput, type EndOutput }
export { createNextTool, executeNext, nextInputSchema, type NextInput, type NextOutput }

/**
 * Create all tools for the plugin
 */
export function createAllTools() {
  return [
    createSetupTool(),
    createDiscussTool(),
    createStatusTool(),
    createModelsTool(),
    createEndTool(),
    createNextTool(),
  ]
}
