/**
 * Council Setup Tool
 * 
 * Tool for setting up a multi-model discussion council
 */

import { z } from 'zod'
import { getCouncil, resetCouncil } from '../core/council'
import { createProviderConfig, PREDEFINED_PROVIDERS } from '../providers/adapter'
import { t } from '../i18n'
import type { ProviderConfig } from '../types'

/**
 * Setup tool input schema
 */
export const setupInputSchema = z.object({
  models: z.array(z.object({
    providerId: z.string().describe('Provider ID (e.g., "kimi", "minimax", "anthropic")'),
    modelId: z.string().optional().describe('Model ID (optional, uses default if not specified)'),
    name: z.string().optional().describe('Display name for this participant'),
    apiKey: z.string().optional().describe('API key (optional, uses configured key if not specified)'),
    baseURL: z.string().optional().describe('Base URL (optional, uses default if not specified)'),
    isHost: z.boolean().optional().describe('Whether this model should be the host'),
  })).min(2).describe('List of models to participate in the discussion'),
  maxRounds: z.number().optional().default(5).describe('Maximum number of discussion rounds'),
  locale: z.enum(['en', 'zh', 'zh-TW', 'ja', 'ko']).optional().default('en').describe('Language for messages'),
})

export type SetupInput = {
  models: Array<{
    providerId: string
    modelId?: string
    name?: string
    apiKey?: string
    baseURL?: string
    isHost?: boolean
  }>
  maxRounds?: number
  locale?: 'en' | 'zh' | 'zh-TW' | 'ja' | 'ko'
}

/**
 * Setup tool output
 */
export interface SetupOutput {
  success: boolean
  message: string
  councilId: string
  participants: Array<{
    id: string
    name: string
    isHost: boolean
  }>
}

/**
 * Execute the setup tool
 */
export async function executeSetup(
  input: SetupInput,
  context: {
    getApiKey?: (providerId: string) => string | undefined
  } = {}
): Promise<SetupOutput> {
  // Reset any existing council
  resetCouncil()

  // Create new council with config (use defaults if not provided)
  const council = getCouncil({
    maxRounds: input.maxRounds ?? 5,
    locale: input.locale ?? 'en',
  })

  const participants: SetupOutput['participants'] = []
  let hostSet = false

  for (const modelConfig of input.models) {
    // Get provider config
    let providerConfig: ProviderConfig

    // Check if it's a predefined provider
    const predefinedFactory = PREDEFINED_PROVIDERS[modelConfig.providerId as keyof typeof PREDEFINED_PROVIDERS]
    
    if (predefinedFactory) {
      const apiKey = modelConfig.apiKey ?? context.getApiKey?.(modelConfig.providerId) ?? ''
      providerConfig = predefinedFactory(apiKey)
      
      // Override model ID if specified
      if (modelConfig.modelId) {
        providerConfig.modelId = modelConfig.modelId
      }
    } else {
      // Custom provider
      providerConfig = createProviderConfig(
        modelConfig.providerId,
        modelConfig.name ?? modelConfig.providerId,
        modelConfig.baseURL ?? '',
        modelConfig.apiKey ?? context.getApiKey?.(modelConfig.providerId) ?? '',
        modelConfig.modelId ?? ''
      )
    }

    // Override name if specified
    if (modelConfig.name) {
      providerConfig.name = modelConfig.name
    }

    // Add participant
    // If user explicitly set isHost on any model, respect that
    // Otherwise, auto-assign first model as host
    let isHost: boolean
    if (modelConfig.isHost !== undefined) {
      isHost = modelConfig.isHost
    } else if (!hostSet && participants.length === 0) {
      // Check if any model has isHost explicitly set to true
      const anyExplicitHost = input.models.some(m => m.isHost === true)
      isHost = !anyExplicitHost
    } else {
      isHost = false
    }

    const participant = council.addParticipant(providerConfig, {
      isHost,
      name: modelConfig.name,
    })

    if (isHost) {
      hostSet = true
    }

    participants.push({
      id: participant.id,
      name: participant.name,
      isHost: participant.isHost,
    })
  }

  return {
    success: true,
    message: t('setup.ready'),
    councilId: council.discussionId,
    participants,
  }
}

/**
 * Create the setup tool definition for OpenCode plugin
 */
export function createSetupTool() {
  return {
    name: 'council_setup',
    description: t('commands.setup.description'),
    parameters: setupInputSchema,
    execute: executeSetup,
  }
}
