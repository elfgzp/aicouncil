/**
 * Provider Adapter Module
 *
 * Adapts different AI providers to a unified interface
 * Uses OpenCode's SDK to call different models
 * Falls back to direct API calls when no OpenCode client is available
 */

import type { ProviderConfig, Participant } from '../types'
import { t } from '../i18n'
import { timeout, retry } from '../utils'

/**
 * Call Kimi API directly (Anthropic-compatible endpoint)
 */
async function callKimiAPI(
  apiKey: string,
  modelId: string,
  prompt: string,
  options: ModelCallOptions = {}
): Promise<ModelResponse> {
  const { systemPrompt, timeout: timeoutMs = 60000 } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    // Kimi uses Anthropic-compatible endpoint for Claude Code
    const response = await fetch('https://api.kimi.com/coding/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        system: systemPrompt,
        max_tokens: options.maxTokens ?? 2000,
        temperature: options.temperature ?? 0.7,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Kimi API error: ${response.status} - ${error}`)
    }

    const data = await response.json() as {
      content?: Array<{ type: string; text?: string }>
      usage?: { input_tokens?: number; output_tokens?: number }
      stop_reason?: string
    }
    const content = data.content?.[0]?.text

    if (!content) {
      throw new Error('Empty response from Kimi API')
    }

    return {
      content,
      usage: {
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
      },
      finishReason: data.stop_reason,
    }
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Call MiniMax API directly (Anthropic-compatible endpoint)
 */
async function callMiniMaxAPI(
  apiKey: string,
  modelId: string,
  prompt: string,
  options: ModelCallOptions = {}
): Promise<ModelResponse> {
  const { systemPrompt, timeout: timeoutMs = 60000 } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    // MiniMax uses Anthropic-compatible endpoint
    const response = await fetch('https://api.minimaxi.com/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        system: systemPrompt,
        max_tokens: options.maxTokens ?? 2000,
        temperature: options.temperature ?? 0.7,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`MiniMax API error: ${response.status} - ${error}`)
    }

    const data = await response.json() as {
      content?: Array<{ type: string; text?: string }>
      usage?: { input_tokens?: number; output_tokens?: number }
      stop_reason?: string
    }
    // Find the first text content in the response (skip thinking blocks)
    const textContent = data.content?.find(c => c.type === 'text')
    const content = textContent?.text

    if (!content) {
      throw new Error('Empty response from MiniMax API')
    }

    return {
      content,
      usage: {
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
      },
      finishReason: data.stop_reason,
    }
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Response from a model call
 */
export interface ModelResponse {
  content: string
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
  }
  finishReason?: string
}

/**
 * Model call options
 */
export interface ModelCallOptions {
  /** System prompt */
  systemPrompt?: string
  /** Maximum tokens to generate */
  maxTokens?: number
  /** Temperature for generation */
  temperature?: number
  /** Timeout in milliseconds */
  timeout?: number
  /** Number of retries */
  retries?: number
}

/**
 * OpenCode client interface (simplified)
 * This will be provided by the plugin context
 */
export interface OpencodeClient {
  session: {
    prompt: (options: {
      body?: {
        model?: {
          providerID: string
          modelID: string
        }
        parts: Array<{ type: 'text'; text: string }>
        system?: Array<{ type: 'text'; text: string }>
      }
    }) => Promise<{
      data?: {
        parts?: Array<{ type: string; text?: string }>
      }
    }>
  }
}

/**
 * Provider adapter class
 */
export class ProviderAdapter {
  private client: OpencodeClient | null = null
  private defaultTimeout = 120000 // 2 minutes
  private defaultRetries = 2

  /**
   * Set the OpenCode client
   */
  setClient(client: OpencodeClient): void {
    this.client = client
  }

  /**
   * Call a model with a prompt directly via API
   * Used when OpenCode client is not available (e.g., in tests)
   */
  private async callDirectAPI(
    participant: Participant,
    prompt: string,
    options: ModelCallOptions = {}
  ): Promise<ModelResponse> {
    const { provider } = participant
    const { systemPrompt, timeout: timeoutMs = this.defaultTimeout } = options

    const callFn = async (): Promise<ModelResponse> => {
      switch (provider.id) {
        case 'kimi':
          return callKimiAPI(provider.apiKey, provider.modelId, prompt, {
            systemPrompt,
            timeout: timeoutMs,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
          })
        case 'minimax':
          return callMiniMaxAPI(provider.apiKey, provider.modelId, prompt, {
            systemPrompt,
            timeout: timeoutMs,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
          })
        default:
          throw new Error(`Direct API not supported for provider: ${provider.id}`)
      }
    }

    return callFn()
  }

  /**
   * Call a model with a prompt
   */
  async call(
    participant: Participant,
    prompt: string,
    options: ModelCallOptions = {}
  ): Promise<ModelResponse> {
    const {
      systemPrompt,
      maxTokens,
      temperature,
      timeout: timeoutMs = this.defaultTimeout,
      retries = this.defaultRetries,
    } = options

    const { provider } = participant

    // If no OpenCode client is set, fall back to direct API calls
    if (!this.client) {
      const callWithTimeout = () =>
        timeout(
          this.callDirectAPI(participant, prompt, options),
          timeoutMs,
          t('errors.timeout', { participant: participant.name })
        )

      return retry(callWithTimeout, {
        maxRetries: retries,
        initialDelay: 1000,
        backoffFactor: 2,
      })
    }

    const callFn = async (): Promise<ModelResponse> => {
      const response = await this.client!.session.prompt({
        body: {
          model: {
            providerID: provider.id,
            modelID: provider.modelId,
          },
          parts: [{ type: 'text', text: prompt }],
          ...(systemPrompt && {
            system: [{ type: 'text', text: systemPrompt }],
          }),
        },
      })

      const content = response.data?.parts
        ?.filter(p => p.type === 'text')
        .map(p => p.text)
        .join('') ?? ''

      if (!content) {
        throw new Error(t('errors.apiError', { message: 'Empty response' }))
      }

      return { content }
    }

    // Apply timeout and retry
    const callWithTimeout = () => timeout(callFn(), timeoutMs, t('errors.timeout', { participant: participant.name }))

    return retry(callWithTimeout, {
      maxRetries: retries,
      initialDelay: 1000,
      backoffFactor: 2,
    })
  }

  /**
   * Call multiple participants in parallel
   */
  async callParallel(
    participants: Participant[],
    prompt: string,
    options: ModelCallOptions = {}
  ): Promise<Map<string, ModelResponse | Error>> {
    const results = new Map<string, ModelResponse | Error>()

    const promises = participants.map(async participant => {
      try {
        const response = await this.call(participant, prompt, options)
        results.set(participant.id, response)
      } catch (error) {
        results.set(
          participant.id,
          error instanceof Error ? error : new Error(String(error))
        )
      }
    })

    await Promise.all(promises)
    return results
  }

  /**
   * Call participants sequentially
   */
  async callSequential(
    participants: Participant[],
    prompt: string,
    options: ModelCallOptions = {},
    onResponse?: (participant: Participant, response: ModelResponse | Error) => void
  ): Promise<Map<string, ModelResponse | Error>> {
    const results = new Map<string, ModelResponse | Error>()

    for (const participant of participants) {
      try {
        const response = await this.call(participant, prompt, options)
        results.set(participant.id, response)
        onResponse?.(participant, response)
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        results.set(participant.id, err)
        onResponse?.(participant, err)
      }
    }

    return results
  }
}

/**
 * Create provider config from OpenCode config
 */
export function createProviderConfig(
  id: string,
  name: string,
  baseURL: string,
  apiKey: string,
  modelId: string
): ProviderConfig {
  return {
    id,
    name,
    baseURL,
    apiKey,
    modelId,
  }
}

/**
 * Predefined provider configurations
 */
export const PREDEFINED_PROVIDERS = {
  /**
   * Create Kimi provider config
   */
  kimi: (apiKey: string): ProviderConfig =>
    createProviderConfig(
      'kimi',
      'Kimi For Coding',
      'https://api.kimi.com/coding/',
      apiKey,
      'kimi-for-coding'
    ),

  /**
   * Create MiniMax provider config
   */
  minimax: (apiKey: string): ProviderConfig =>
    createProviderConfig(
      'minimax',
      'MiniMax M2.1',
      'https://api.minimaxi.com/anthropic',
      apiKey,
      'MiniMax-M2.1'
    ),

  /**
   * Create Anthropic (Claude) provider config
   */
  anthropic: (apiKey: string, modelId = 'claude-sonnet-4-20250514'): ProviderConfig =>
    createProviderConfig(
      'anthropic',
      'Claude',
      'https://api.anthropic.com',
      apiKey,
      modelId
    ),

  /**
   * Create OpenAI provider config
   */
  openai: (apiKey: string, modelId = 'gpt-4o'): ProviderConfig =>
    createProviderConfig(
      'openai',
      'GPT-4o',
      'https://api.openai.com/v1',
      apiKey,
      modelId
    ),
}

// Singleton instance
export const providerAdapter = new ProviderAdapter()
