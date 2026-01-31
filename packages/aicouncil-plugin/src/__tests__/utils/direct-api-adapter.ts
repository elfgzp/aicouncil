/**
 * Direct API Adapter for Testing
 *
 * This adapter makes direct API calls to Kimi and MiniMax
 * without requiring the OpenCode client.
 */

import type { Participant, ModelResponse } from '../../types'

interface ModelCallOptions {
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  timeout?: number
}

/**
 * Call Kimi API directly
 */
async function callKimiAPI(
  apiKey: string,
  modelId: string,
  prompt: string,
  options: ModelCallOptions = {}
): Promise<ModelResponse> {
  const { systemPrompt, timeout = 60000 } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch('https://api.kimi.com/coding/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Kimi API error: ${response.status} - ${error}`)
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
      usage?: { input_tokens?: number; output_tokens?: number }
    }
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('Empty response from Kimi API')
    }

    return {
      content,
      usage: data.usage,
      finishReason: data.choices?.[0]?.finish_reason,
    }
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Call MiniMax API directly
 */
async function callMiniMaxAPI(
  apiKey: string,
  modelId: string,
  prompt: string,
  options: ModelCallOptions = {}
): Promise<ModelResponse> {
  const { systemPrompt, timeout = 60000 } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    // MiniMax uses Anthropic-compatible endpoint
    const response = await fetch('https://api.minimaxi.com/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
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
      content?: Array<{ text?: string }>
      usage?: { input_tokens?: number; output_tokens?: number }
      stop_reason?: string
    }
    const content = data.content?.[0]?.text

    if (!content) {
      throw new Error('Empty response from MiniMax API')
    }

    return {
      content,
      usage: data.usage,
      finishReason: data.stop_reason,
    }
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Direct API adapter for testing
 */
export class DirectAPIAdapter {
  async call(
    participant: Participant,
    prompt: string,
    options: ModelCallOptions = {}
  ): Promise<ModelResponse> {
    const { provider } = participant

    switch (provider.id) {
      case 'kimi':
        return callKimiAPI(provider.apiKey, provider.modelId, prompt, options)
      case 'minimax':
        return callMiniMaxAPI(provider.apiKey, provider.modelId, prompt, options)
      default:
        throw new Error(`Unsupported provider: ${provider.id}`)
    }
  }
}

// Singleton instance
export const directAPIAdapter = new DirectAPIAdapter()
