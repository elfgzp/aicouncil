/**
 * Test Mocks for Providers
 *
 * These mocks help simulate provider responses for testing.
 */

import type { Participant, ProviderConfig, Message } from '../../types'
import type { ModelResponse } from '../../providers/adapter'

/**
 * Create a mock provider config
 */
export function createMockProviderConfig(
  overrides: Partial<ProviderConfig> = {}
): ProviderConfig {
  return {
    id: 'mock-provider',
    name: 'Mock Provider',
    baseURL: 'https://api.mock.com',
    apiKey: 'mock-api-key',
    modelId: 'mock-model',
    ...overrides,
  }
}

/**
 * Create a mock participant
 */
export function createMockParticipant(
  overrides: Partial<Participant> = {}
): Participant {
  return {
    id: `participant-${Date.now()}`,
    name: 'Mock Participant',
    provider: createMockProviderConfig(),
    isHost: false,
    status: 'idle',
    ...overrides,
  }
}

/**
 * Create a mock model response
 */
export function createMockResponse(
  content: string,
  overrides: Partial<ModelResponse> = {}
): ModelResponse {
  return {
    content,
    ...overrides,
  }
}

/**
 * Create a sequence of mock responses
 */
export function createMockResponseSequence(
  responses: string[]
): () => Promise<ModelResponse> {
  let index = 0
  return async () => {
    const content = responses[index % responses.length]
    index++
    return createMockResponse(content)
  }
}

/**
 * Create a mock provider adapter that returns predefined responses
 */
export function createMockProviderAdapter(
  responseMap: Map<string, string> | Record<string, string>
) {
  const map = responseMap instanceof Map
    ? responseMap
    : new Map(Object.entries(responseMap))

  return {
    call: async (participant: Participant, prompt: string) => {
      const response = map.get(participant.id) || map.get(participant.name)
      if (response) {
        return createMockResponse(response)
      }
      throw new Error(`No mock response for participant: ${participant.name}`)
    },
    callParallel: async (participants: Participant[], prompt: string) => {
      const results = new Map()
      for (const p of participants) {
        const response = map.get(p.id) || map.get(p.name)
        results.set(p.id, response ? createMockResponse(response) : new Error('No response'))
      }
      return results
    },
    callSequential: async (
      participants: Participant[],
      prompt: string,
      options?: any,
      onResponse?: (p: Participant, r: any) => void
    ) => {
      const results = new Map()
      for (const p of participants) {
        const response = map.get(p.id) || map.get(p.name)
        const result = response ? createMockResponse(response) : new Error('No response')
        results.set(p.id, result)
        onResponse?.(p, result)
      }
      return results
    },
  }
}

/**
 * Simulate a discussion with predefined responses
 */
export function simulateDiscussion(
  participants: Participant[],
  rounds: number,
  responseGenerator: (participant: Participant, round: number, prompt: string) => string
) {
  const messages: Message[] = []

  for (let round = 1; round <= rounds; round++) {
    for (const participant of participants) {
      const content = responseGenerator(participant, round, `Round ${round}`)
      messages.push({
        id: `msg-${round}-${participant.id}`,
        from: participant.name,
        content,
        round,
        timestamp: new Date(),
        type: 'assistant',
        metadata: { participantId: participant.id, isHost: participant.isHost },
      })
    }
  }

  return messages
}

/**
 * Create a delayed mock response
 */
export function createDelayedResponse(
  content: string,
  delayMs: number
): Promise<ModelResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(createMockResponse(content))
    }, delayMs)
  })
}

/**
 * Create a failing mock response
 */
export function createFailingResponse(errorMessage: string): Promise<never> {
  return Promise.reject(new Error(errorMessage))
}

/**
 * Mock OpenCode client for integration tests
 */
export function createMockOpenCodeClient(
  responseHandler?: (options: any) => Promise<any>
) {
  const defaultHandler = async () => ({
    data: {
      parts: [{ type: 'text', text: 'Mock response' }],
    },
  })

  return {
    session: {
      prompt: responseHandler || defaultHandler,
    },
  }
}
