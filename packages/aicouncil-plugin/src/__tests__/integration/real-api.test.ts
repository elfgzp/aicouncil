/**
 * Real API Integration Tests
 *
 * These tests make actual API calls to Kimi and MiniMax.
 * Requires KIMI_API_KEY and MINIMAX_API_KEY environment variables.
 *
 * Run with: bun test src/__tests__/integration/real-api.test.ts
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { Council, getCouncil, resetCouncil } from '../../core/council'
import { providerAdapter, PREDEFINED_PROVIDERS } from '../../providers/adapter'
import type { ProviderConfig, Participant } from '../../types'
import { directAPIAdapter } from '../utils/direct-api-adapter'

// Check if API keys are available
const hasKimiKey = !!process.env.KIMI_API_KEY
const hasMinimaxKey = !!process.env.MINIMAX_API_KEY

// Check if we're in a real API test environment
// These tests require API keys with direct API access (not just OpenCode client)
// Note: Kimi API key must have access to 'kimi-for-coding' model via Coding Agents
// Note: MiniMax API key must have access to 'MiniMax-M2.1' model
const canRunRealAPITests = hasKimiKey && hasMinimaxKey && process.env.ENABLE_REAL_API_TESTS === 'true'

// Log API key status before tests
console.log('API Key Status:')
console.log('  KIMI_API_KEY:', hasKimiKey ? 'present' : 'missing')
console.log('  MINIMAX_API_KEY:', hasMinimaxKey ? 'present' : 'missing')
console.log('  ENABLE_REAL_API_TESTS:', process.env.ENABLE_REAL_API_TESTS)
console.log('  canRunRealAPITests:', canRunRealAPITests)

// Skip tests if API keys are not available or direct API access is not enabled
const describeIf = (condition: boolean) => condition ? describe : describe.skip

describeIf(canRunRealAPITests)('Real API Integration Tests', () => {
  let council: Council
  let kimiConfig: ProviderConfig
  let minimaxConfig: ProviderConfig
  let kimiApiWorking = false
  let minimaxApiWorking = false

  beforeAll(async () => {
    // Create provider configs from environment variables
    kimiConfig = PREDEFINED_PROVIDERS.kimi(process.env.KIMI_API_KEY!)
    minimaxConfig = PREDEFINED_PROVIDERS.minimax(process.env.MINIMAX_API_KEY!)

    // Pre-flight check: Verify API keys work
    console.log('\n🔍 Running API pre-flight checks...')
    console.log('   This may take up to 60 seconds...')

    // Test Kimi API
    try {
      const testKimiParticipant = {
        id: 'test-kimi',
        name: 'TestKimi',
        provider: kimiConfig,
        isHost: false,
        status: 'idle' as const,
      }
      const kimiResponse = await providerAdapter.call(testKimiParticipant, 'Say "Kimi API test passed"', {
        maxTokens: 50,
        timeout: 30000,
      })
      console.log('✅ Kimi API check passed:', kimiResponse.content.substring(0, 100))
      kimiApiWorking = true
    } catch (error) {
      console.error('❌ Kimi API check failed:', error instanceof Error ? error.message : String(error))
      console.error('   Note: Kimi API key may not have access to kimi-for-coding model')
      console.error('   This model is only available for Coding Agents (Kimi CLI, Claude Code, etc.)')
    }

    // Test MiniMax API
    try {
      const testMinimaxParticipant = {
        id: 'test-minimax',
        name: 'TestMiniMax',
        provider: minimaxConfig,
        isHost: false,
        status: 'idle' as const,
      }
      const minimaxResponse = await providerAdapter.call(testMinimaxParticipant, 'Say "MiniMax API test passed"', {
        maxTokens: 50,
        timeout: 30000,
      })
      console.log('✅ MiniMax API check passed:', minimaxResponse.content.substring(0, 100))
      minimaxApiWorking = true
    } catch (error) {
      console.error('❌ MiniMax API check failed:', error instanceof Error ? error.message : String(error))
    }

    if (!kimiApiWorking || !minimaxApiWorking) {
      console.log('\n⚠️  Warning: Some APIs are not working. Tests may fail.')
      console.log('   Kimi API:', kimiApiWorking ? '✅' : '❌')
      console.log('   MiniMax API:', minimaxApiWorking ? '✅' : '❌')
    } else {
      console.log('\n✅ All API pre-flight checks passed!\n')
    }
  }, 120000) // 2 minute timeout for beforeAll hook

  beforeEach(() => {
    resetCouncil()
    council = getCouncil({ maxRounds: 2, responseTimeout: 60000 })
  })

  describe('Single Round Discussion', () => {
    it('should conduct a discussion between Kimi and MiniMax', async () => {
      // Skip if APIs are not working
      if (!kimiApiWorking || !minimaxApiWorking) {
        console.log('Skipping: One or both APIs are not working')
        return
      }

      // Setup participants
      council.addParticipant(kimiConfig, { isHost: true, name: 'Kimi' })
      council.addParticipant(minimaxConfig, { name: 'MiniMax' })

      // Collect messages and errors
      const messages: Array<{ from: string; content: string }> = []
      const errors: Array<{ from: string; error: Error }> = []
      council.on('message:new', (msg) => {
        messages.push({ from: msg.from, content: msg.content })
        console.log(`[${msg.from}]: ${msg.content.substring(0, 100)}...`)
      })
      council.on('participant:error', (p, error) => {
        errors.push({ from: p.name, error })
        console.error(`[Error from ${p.name}]:`, error.message)
      })

      // Start discussion
      const topic = 'What are the key benefits of TypeScript for large projects?'
      await council.startDiscussion(topic)

      // Debug output
      console.log('Messages received:', messages.length)
      console.log('Errors received:', errors.length)

      // Verify results
      expect(messages.length).toBeGreaterThanOrEqual(2)
      expect(messages[0].from).toBe('Kimi') // Host speaks first
      expect(messages[1].from).toBe('MiniMax')

      // Verify content is meaningful
      expect(messages[0].content.length).toBeGreaterThan(50)
      expect(messages[1].content.length).toBeGreaterThan(50)
    }, 120000) // 2 minute timeout

    it('should handle Chinese language discussion', async () => {
      // Skip if APIs are not working
      if (!kimiApiWorking || !minimaxApiWorking) {
        console.log('Skipping: One or both APIs are not working')
        return
      }

      council.addParticipant(kimiConfig, { isHost: true, name: 'Kimi' })
      council.addParticipant(minimaxConfig, { name: 'MiniMax' })

      const messages: string[] = []
      council.on('message:new', (msg) => {
        messages.push(msg.content)
      })

      const topic = '请讨论人工智能在软件开发中的应用'
      await council.startDiscussion(topic)

      expect(messages.length).toBeGreaterThanOrEqual(2)
      // Both models should respond in Chinese
      expect(messages[0]).toMatch(/[\u4e00-\u9fa5]/) // Contains Chinese characters
    }, 120000)
  })

  describe('Multi-Round Discussion', () => {
    it('should conduct multiple rounds of discussion', async () => {
      // Skip if APIs are not working
      if (!kimiApiWorking || !minimaxApiWorking) {
        console.log('Skipping: One or both APIs are not working')
        return
      }

      council.addParticipant(kimiConfig, { isHost: true, name: 'Kimi' })
      council.addParticipant(minimaxConfig, { name: 'MiniMax' })

      const roundMessages: Array<{ round: number; from: string }> = []
      council.on('message:new', (msg) => {
        roundMessages.push({ round: msg.round, from: msg.from })
      })

      // Start discussion
      await council.startDiscussion('How to design a scalable microservices architecture?')

      // Continue to next round
      await council.nextRound()

      // Should have messages from both rounds
      const round1Messages = roundMessages.filter(m => m.round === 1)
      const round2Messages = roundMessages.filter(m => m.round === 2)

      expect(round1Messages.length).toBeGreaterThanOrEqual(2)
      expect(round2Messages.length).toBeGreaterThanOrEqual(2)

      // Host should speak first in each round
      expect(round1Messages[0].from).toBe('Kimi')
      expect(round2Messages[0].from).toBe('Kimi')
    }, 180000)
  })

  describe('Error Handling', () => {
    it('should handle invalid API key gracefully', async () => {
      // Skip if we can't create a valid config to test against
      if (!kimiConfig) {
        console.log('Skipping: No valid Kimi config available')
        return
      }

      const invalidConfig: ProviderConfig = {
        ...kimiConfig,
        apiKey: 'invalid-key',
      }

      council.addParticipant(invalidConfig, { isHost: true, name: 'Invalid' })
      council.addParticipant(minimaxConfig, { name: 'MiniMax' })

      const errors: Error[] = []
      council.on('participant:error', (p, error) => {
        errors.push(error)
      })

      try {
        await council.startDiscussion('Test topic')
      } catch (e) {
        // Expected to fail
      }

      // Should have recorded an error
      expect(errors.length).toBeGreaterThan(0)
    }, 30000)

    it('should continue if one participant fails', async () => {
      // Skip if Kimi API is not working (we need at least one working API)
      if (!kimiApiWorking) {
        console.log('Skipping: Kimi API is not working')
        return
      }

      const invalidConfig: ProviderConfig = {
        ...minimaxConfig,
        apiKey: 'invalid-token',
      }

      council.addParticipant(kimiConfig, { isHost: true, name: 'Kimi' })
      council.addParticipant(invalidConfig, { name: 'InvalidMiniMax' })

      const messages: string[] = []
      council.on('message:new', (msg) => {
        if (msg.type === 'assistant') {
          messages.push(msg.from)
        }
      })

      await council.startDiscussion('Test topic')

      // Kimi should still respond even if MiniMax fails
      expect(messages).toContain('Kimi')
    }, 60000)
  })

  describe('Discussion Context', () => {
    it('should maintain context across rounds', async () => {
      // Skip if APIs are not working
      if (!kimiApiWorking || !minimaxApiWorking) {
        console.log('Skipping: One or both APIs are not working')
        return
      }

      council.addParticipant(kimiConfig, { isHost: true, name: 'Kimi' })
      council.addParticipant(minimaxConfig, { name: 'MiniMax' })

      const allMessages: Array<{ round: number; from: string; content: string }> = []
      council.on('message:new', (msg) => {
        allMessages.push({
          round: msg.round,
          from: msg.from,
          content: msg.content,
        })
      })

      // First round - introduce topic
      await council.startDiscussion('What is the best approach to handle errors in async code?')

      // Second round - should reference previous discussion
      await council.nextRound()

      // Check that round 2 messages exist and are substantive
      const round2Messages = allMessages.filter(m => m.round === 2)
      expect(round2Messages.length).toBeGreaterThanOrEqual(2)

      // Messages should be substantial (not just acknowledgments)
      round2Messages.forEach(msg => {
        expect(msg.content.length).toBeGreaterThan(100)
      })
    }, 180000)
  })

  describe('Different Topics', () => {
    const topics = [
      'Explain the trade-offs between SQL and NoSQL databases',
      'What are the best practices for API versioning?',
      'How should teams approach code reviews effectively?',
    ]

    topics.forEach((topic, index) => {
      it(`should discuss topic ${index + 1}: ${topic.substring(0, 50)}...`, async () => {
        // Skip if APIs are not working
        if (!kimiApiWorking || !minimaxApiWorking) {
          console.log('Skipping: One or both APIs are not working')
          return
        }

        resetCouncil()
        council = getCouncil({ maxRounds: 1, responseTimeout: 60000 })

        council.addParticipant(kimiConfig, { isHost: true, name: 'Kimi' })
        council.addParticipant(minimaxConfig, { name: 'MiniMax' })

        const messages: string[] = []
        council.on('message:new', (msg) => {
          messages.push(msg.content)
        })

        await council.startDiscussion(topic)

        expect(messages.length).toBeGreaterThanOrEqual(2)
        expect(messages[0].length).toBeGreaterThan(50)
        expect(messages[1].length).toBeGreaterThan(50)
      }, 120000)
    })
  })
})

describe('API Key Validation', () => {
  it('should verify environment variables are set', () => {
    console.log('KIMI_API_KEY present:', !!process.env.KIMI_API_KEY)
    console.log('MINIMAX_API_KEY present:', !!process.env.MINIMAX_API_KEY)

    // Only validate API keys if explicitly running real API tests
    if (process.env.ENABLE_REAL_API_TESTS === 'true') {
      expect(process.env.KIMI_API_KEY).toBeDefined()
      expect(process.env.KIMI_API_KEY?.startsWith('sk-')).toBe(true)

      expect(process.env.MINIMAX_API_KEY).toBeDefined()
      expect(process.env.MINIMAX_API_KEY?.length).toBeGreaterThan(10)
    } else {
      // Skip validation when not running real API tests
      console.log('Skipping API key validation (ENABLE_REAL_API_TESTS not set)')
    }
  })
})

describe('DirectAPIAdapter', () => {
  const mockFetch = vi.fn()
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.resetAllMocks()
    global.fetch = mockFetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('should call Kimi API with correct parameters', async () => {
    const mockResponse = {
      choices: [{
        message: { content: 'Test response from Kimi' },
        finish_reason: 'stop'
      }],
      usage: { input_tokens: 10, output_tokens: 5 }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const participant = {
      id: 'test-kimi',
      name: 'Kimi',
      provider: {
        id: 'kimi',
        name: 'Kimi',
        apiKey: 'test-api-key',
        modelId: 'kimi-for-coding',
        baseURL: 'https://api.kimi.com'
      },
      isHost: true,
      status: 'idle'
    } as Participant

    const result = await directAPIAdapter.call(participant, 'Test prompt', {
      systemPrompt: 'Test system prompt',
      temperature: 0.5,
      maxTokens: 1000
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.kimi.com/coding/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key'
        },
        body: expect.stringContaining('kimi-for-coding')
      })
    )

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(requestBody).toEqual({
      model: 'kimi-for-coding',
      messages: [
        { role: 'system', content: 'Test system prompt' },
        { role: 'user', content: 'Test prompt' }
      ],
      temperature: 0.5,
      max_tokens: 1000
    })

    expect(result.content).toBe('Test response from Kimi')
    expect(result.usage).toEqual({ input_tokens: 10, output_tokens: 5 })
    expect(result.finishReason).toBe('stop')
  })

  it('should call MiniMax API with correct parameters', async () => {
    const mockResponse = {
      content: [{ text: 'Test response from MiniMax' }],
      usage: { input_tokens: 15, output_tokens: 8 },
      stop_reason: 'end_turn'
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const participant = {
      id: 'test-minimax',
      name: 'MiniMax',
      provider: {
        id: 'minimax',
        name: 'MiniMax',
        apiKey: 'test-api-key',
        modelId: 'MiniMax-M2.1',
        baseURL: 'https://api.minimaxi.com'
      },
      isHost: false,
      status: 'idle'
    } as Participant

    const result = await directAPIAdapter.call(participant, 'Test prompt', {
      systemPrompt: 'Test system prompt',
      temperature: 0.8,
      maxTokens: 2000
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.minimaxi.com/anthropic/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key'
        }
      })
    )

    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(requestBody).toEqual({
      model: 'MiniMax-M2.1',
      messages: [{ role: 'user', content: 'Test prompt' }],
      system: 'Test system prompt',
      max_tokens: 2000,
      temperature: 0.8
    })

    expect(result.content).toBe('Test response from MiniMax')
    expect(result.usage).toEqual({ input_tokens: 15, output_tokens: 8 })
    expect(result.finishReason).toBe('end_turn')
  })

  it('should throw error for unsupported provider', async () => {
    const participant = {
      id: 'test-unknown',
      name: 'Unknown',
      provider: {
        id: 'unknown',
        name: 'Unknown Provider',
        apiKey: 'test-key',
        modelId: 'model',
        baseURL: 'https://api.unknown.com'
      },
      isHost: false,
      status: 'idle'
    } as Participant

    await expect(directAPIAdapter.call(participant, 'Test')).rejects.toThrow('Unsupported provider: unknown')
  })

  it('should handle Kimi API errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({ error: { message: 'Access denied' } })
    })

    const participant = {
      id: 'test-kimi',
      name: 'Kimi',
      provider: {
        id: 'kimi',
        name: 'Kimi',
        apiKey: 'invalid-key',
        modelId: 'kimi-for-coding',
        baseURL: 'https://api.kimi.com'
      },
      isHost: false,
      status: 'idle'
    } as Participant

    await expect(directAPIAdapter.call(participant, 'Test')).rejects.toThrow('Kimi API error: 403')
  })

  it('should handle timeout', async () => {
    // Mock fetch to delay longer than timeout
    mockFetch.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 5000))
    )

    const participant = {
      id: 'test-kimi',
      name: 'Kimi',
      provider: {
        id: 'kimi',
        name: 'Kimi',
        apiKey: 'test-key',
        modelId: 'kimi-for-coding',
        baseURL: 'https://api.kimi.com'
      },
      isHost: false,
      status: 'idle'
    } as Participant

    // Should throw due to timeout
    await expect(directAPIAdapter.call(participant, 'Test', { timeout: 100 }))
      .rejects.toThrow()
  }, 10000)
})

describe('Provider Adapter Integration', () => {
  beforeEach(() => {
    resetCouncil()
  })

  it('should use DirectAPIAdapter when providerAdapter.call is replaced', async () => {
    const mockCall = vi.fn().mockResolvedValue({
      content: 'Mock response',
      usage: { input_tokens: 10, output_tokens: 5 }
    })

    // Temporarily replace the call method
    const originalCall = providerAdapter.call.bind(providerAdapter)
    providerAdapter.call = mockCall

    try {
      const council = getCouncil({ maxRounds: 1, responseTimeout: 60000 })

      council.addParticipant(PREDEFINED_PROVIDERS.kimi('test-key'), { isHost: true, name: 'Kimi' })
      council.addParticipant(PREDEFINED_PROVIDERS.minimax('test-key'), { name: 'MiniMax' })

      const messages: string[] = []
      council.on('message:new', (msg) => {
        messages.push(msg.content)
      })

      await council.startDiscussion('Test topic')

      expect(mockCall).toHaveBeenCalledTimes(2)
      expect(messages.length).toBe(2)
      expect(messages[0]).toBe('Mock response')
      expect(messages[1]).toBe('Mock response')
    } finally {
      // Restore original method
      providerAdapter.call = originalCall
    }
  })
})
