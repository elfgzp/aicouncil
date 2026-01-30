/**
 * Council Models Tool
 * 
 * Tool for listing available models
 */

import { z } from 'zod'
import { PREDEFINED_PROVIDERS } from '../providers/adapter'
import { t } from '../i18n'

/**
 * Models tool input schema
 */
export const modelsInputSchema = z.object({})

export type ModelsInput = z.infer<typeof modelsInputSchema>

/**
 * Model info
 */
export interface ModelInfo {
  providerId: string
  name: string
  description: string
  defaultModelId: string
  requiresApiKey: boolean
}

/**
 * Models tool output
 */
export interface ModelsOutput {
  predefined: ModelInfo[]
  customSupported: boolean
  message: string
}

/**
 * Execute the models tool
 */
export async function executeModels(_input: ModelsInput): Promise<ModelsOutput> {
  const predefined: ModelInfo[] = [
    {
      providerId: 'kimi',
      name: 'Kimi For Coding',
      description: 'Kimi AI coding assistant from Moonshot',
      defaultModelId: 'kimi-for-coding',
      requiresApiKey: true,
    },
    {
      providerId: 'minimax',
      name: 'MiniMax M2.1',
      description: 'MiniMax M2.1 model with Anthropic-compatible API',
      defaultModelId: 'MiniMax-M2.1',
      requiresApiKey: true,
    },
    {
      providerId: 'anthropic',
      name: 'Claude',
      description: 'Anthropic Claude models',
      defaultModelId: 'claude-sonnet-4-20250514',
      requiresApiKey: true,
    },
    {
      providerId: 'openai',
      name: 'GPT-4o',
      description: 'OpenAI GPT-4o model',
      defaultModelId: 'gpt-4o',
      requiresApiKey: true,
    },
  ]

  return {
    predefined,
    customSupported: true,
    message: t('commands.models.description'),
  }
}

/**
 * Create the models tool definition for OpenCode plugin
 */
export function createModelsTool() {
  return {
    name: 'council_models',
    description: t('commands.models.description'),
    parameters: modelsInputSchema,
    execute: executeModels,
  }
}
