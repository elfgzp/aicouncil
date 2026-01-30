import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ProviderAdapter,
  createProviderConfig,
  PREDEFINED_PROVIDERS,
} from './adapter'
import type { Participant } from '../types'

describe('ProviderAdapter', () => {
  let adapter: ProviderAdapter
  const mockClient = {
    session: {
      prompt: vi.fn(),
    },
  }

  const mockParticipant: Participant = {
    id: 'test-id',
    name: 'Test Participant',
    provider: {
      id: 'test-provider',
      name: 'Test Provider',
      baseURL: 'https://api.test.com',
      apiKey: 'test-key',
      modelId: 'test-model',
    },
    isHost: false,
    status: 'idle',
  }

  beforeEach(() => {
    adapter = new ProviderAdapter()
    vi.clearAllMocks()
  })

  describe('setClient', () => {
    it('should set the client', () => {
      adapter.setClient(mockClient as any)
      // Client is private, we test it through call method
    })
  })

  describe('call', () => {
    beforeEach(() => {
      adapter.setClient(mockClient as any)
    })

    it('should throw error if client not initialized', async () => {
      const uninitializedAdapter = new ProviderAdapter()

      await expect(
        uninitializedAdapter.call(mockParticipant, 'Hello')
      ).rejects.toThrow('OpenCode client not initialized')
    })

    it('should call model with prompt', async () => {
      vi.mocked(mockClient.session.prompt).mockResolvedValue({
        data: {
          parts: [{ type: 'text', text: 'Response text' }],
        },
      })

      const result = await adapter.call(mockParticipant, 'Hello')

      expect(mockClient.session.prompt).toHaveBeenCalledWith({
        body: {
          model: {
            providerID: 'test-provider',
            modelID: 'test-model',
          },
          parts: [{ type: 'text', text: 'Hello' }],
        },
      })
      expect(result.content).toBe('Response text')
    })

    it('should include system prompt when provided', async () => {
      vi.mocked(mockClient.session.prompt).mockResolvedValue({
        data: {
          parts: [{ type: 'text', text: 'Response' }],
        },
      })

      await adapter.call(mockParticipant, 'Hello', {
        systemPrompt: 'You are a helpful assistant',
      })

      expect(mockClient.session.prompt).toHaveBeenCalledWith({
        body: expect.objectContaining({
          system: [{ type: 'text', text: 'You are a helpful assistant' }],
        }),
      })
    })

    it('should throw error on empty response', async () => {
      vi.mocked(mockClient.session.prompt).mockResolvedValue({
        data: {
          parts: [],
        },
      })

      await expect(adapter.call(mockParticipant, 'Hello')).rejects.toThrow(
        'Empty response'
      )
    })

    it('should throw error on null response data', async () => {
      vi.mocked(mockClient.session.prompt).mockResolvedValue({})

      await expect(adapter.call(mockParticipant, 'Hello')).rejects.toThrow(
        'Empty response'
      )
    })

    it('should combine multiple text parts', async () => {
      vi.mocked(mockClient.session.prompt).mockResolvedValue({
        data: {
          parts: [
            { type: 'text', text: 'Part 1 ' },
            { type: 'text', text: 'Part 2' },
          ],
        },
      })

      const result = await adapter.call(mockParticipant, 'Hello')

      expect(result.content).toBe('Part 1 Part 2')
    })

    it('should filter non-text parts', async () => {
      vi.mocked(mockClient.session.prompt).mockResolvedValue({
        data: {
          parts: [
            { type: 'text', text: 'Text part' },
            { type: 'image', url: 'image.png' },
            { type: 'text', text: ' More text' },
          ],
        },
      })

      const result = await adapter.call(mockParticipant, 'Hello')

      expect(result.content).toBe('Text part More text')
    })

    it('should apply timeout', async () => {
      vi.mocked(mockClient.session.prompt).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: { parts: [{ type: 'text', text: 'Response' }] },
                }),
              100
            )
          )
      )

      await expect(
        adapter.call(mockParticipant, 'Hello', { timeout: 50 })
      ).rejects.toThrow(/[Tt]imeout/)
    })

    it('should retry on failure', async () => {
      vi.mocked(mockClient.session.prompt)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          data: { parts: [{ type: 'text', text: 'Success' }] },
        })

      const result = await adapter.call(mockParticipant, 'Hello', {
        retries: 3,
      })

      expect(result.content).toBe('Success')
      expect(mockClient.session.prompt).toHaveBeenCalledTimes(3)
    })

    it('should throw after max retries', async () => {
      vi.mocked(mockClient.session.prompt).mockRejectedValue(
        new Error('Persistent error')
      )

      await expect(
        adapter.call(mockParticipant, 'Hello', { retries: 2 })
      ).rejects.toThrow('Persistent error')

      expect(mockClient.session.prompt).toHaveBeenCalledTimes(3)
    })
  })

  describe('callParallel', () => {
    const participants: Participant[] = [
      {
        id: 'p1',
        name: 'Participant 1',
        provider: { ...mockParticipant.provider, id: 'provider-1' },
        isHost: false,
        status: 'idle',
      },
      {
        id: 'p2',
        name: 'Participant 2',
        provider: { ...mockParticipant.provider, id: 'provider-2' },
        isHost: false,
        status: 'idle',
      },
    ]

    beforeEach(() => {
      adapter.setClient(mockClient as any)
    })

    it('should call multiple participants in parallel', async () => {
      vi.mocked(mockClient.session.prompt).mockResolvedValue({
        data: { parts: [{ type: 'text', text: 'Response' }] },
      })

      const results = await adapter.callParallel(participants, 'Hello')

      expect(results.size).toBe(2)
      expect(mockClient.session.prompt).toHaveBeenCalledTimes(2)
    })

    it('should handle mixed success and failure', async () => {
      // Use mockImplementation to return success for provider-1 and error for provider-2
      vi.mocked(mockClient.session.prompt).mockImplementation(async (options) => {
        const providerID = options?.body?.model?.providerID
        if (providerID === 'provider-1') {
          return { data: { parts: [{ type: 'text', text: 'Success' }] } }
        }
        throw new Error('Failed')
      })

      const results = await adapter.callParallel(participants, 'Hello')

      expect(results.size).toBe(2)
      expect(results.get('p1')).toEqual({ content: 'Success' })
      expect(results.get('p2')).toBeInstanceOf(Error)
    })
  })

  describe('callSequential', () => {
    const participants: Participant[] = [
      {
        id: 'p1',
        name: 'Participant 1',
        provider: { ...mockParticipant.provider, id: 'provider-1' },
        isHost: false,
        status: 'idle',
      },
      {
        id: 'p2',
        name: 'Participant 2',
        provider: { ...mockParticipant.provider, id: 'provider-2' },
        isHost: false,
        status: 'idle',
      },
    ]

    beforeEach(() => {
      adapter.setClient(mockClient as any)
    })

    it('should call participants sequentially', async () => {
      const callOrder: string[] = []
      vi.mocked(mockClient.session.prompt).mockImplementation(async () => {
        callOrder.push('call')
        await new Promise((resolve) => setTimeout(resolve, 10))
        return { data: { parts: [{ type: 'text', text: 'Response' }] } }
      })

      await adapter.callSequential(participants, 'Hello')

      expect(callOrder).toHaveLength(2)
    })

    it('should call onResponse callback for each participant', async () => {
      vi.mocked(mockClient.session.prompt).mockResolvedValue({
        data: { parts: [{ type: 'text', text: 'Response' }] },
      })

      const onResponse = vi.fn()
      await adapter.callSequential(participants, 'Hello', {}, onResponse)

      expect(onResponse).toHaveBeenCalledTimes(2)
    })

    it('should continue after participant error', async () => {
      // Use mockImplementation to return error for provider-1 and success for provider-2
      vi.mocked(mockClient.session.prompt).mockImplementation(async (options) => {
        const providerID = options?.body?.model?.providerID
        if (providerID === 'provider-1') {
          throw new Error('Failed')
        }
        return { data: { parts: [{ type: 'text', text: 'Success' }] } }
      })

      const onResponse = vi.fn()
      await adapter.callSequential(participants, 'Hello', {}, onResponse)

      expect(onResponse).toHaveBeenCalledTimes(2)
      expect(onResponse).toHaveBeenNthCalledWith(
        1,
        participants[0],
        expect.any(Error)
      )
      expect(onResponse).toHaveBeenNthCalledWith(
        2,
        participants[1],
        expect.objectContaining({ content: 'Success' })
      )
    })
  })
})

describe('createProviderConfig', () => {
  it('should create provider config', () => {
    const config = createProviderConfig(
      'custom',
      'Custom Provider',
      'https://api.custom.com',
      'api-key',
      'custom-model'
    )

    expect(config).toEqual({
      id: 'custom',
      name: 'Custom Provider',
      baseURL: 'https://api.custom.com',
      apiKey: 'api-key',
      modelId: 'custom-model',
    })
  })
})

describe('PREDEFINED_PROVIDERS', () => {
  describe('kimi', () => {
    it('should create Kimi provider config', () => {
      const config = PREDEFINED_PROVIDERS.kimi('test-api-key')

      expect(config.id).toBe('kimi')
      expect(config.name).toBe('Kimi For Coding')
      expect(config.baseURL).toBe('https://api.kimi.com/coding/')
      expect(config.apiKey).toBe('test-api-key')
      expect(config.modelId).toBe('kimi-for-coding')
    })
  })

  describe('minimax', () => {
    it('should create MiniMax provider config', () => {
      const config = PREDEFINED_PROVIDERS.minimax('test-jwt-token')

      expect(config.id).toBe('minimax')
      expect(config.name).toBe('MiniMax M2.1')
      expect(config.baseURL).toBe('https://api.minimaxi.com/anthropic')
      expect(config.apiKey).toBe('test-jwt-token')
      expect(config.modelId).toBe('MiniMax-M2.1')
    })
  })

  describe('anthropic', () => {
    it('should create Anthropic provider config with default model', () => {
      const config = PREDEFINED_PROVIDERS.anthropic('test-api-key')

      expect(config.id).toBe('anthropic')
      expect(config.name).toBe('Claude')
      expect(config.baseURL).toBe('https://api.anthropic.com')
      expect(config.apiKey).toBe('test-api-key')
      expect(config.modelId).toBe('claude-sonnet-4-20250514')
    })

    it('should create Anthropic provider config with custom model', () => {
      const config = PREDEFINED_PROVIDERS.anthropic(
        'test-api-key',
        'claude-opus-4-20250514'
      )

      expect(config.modelId).toBe('claude-opus-4-20250514')
    })
  })

  describe('openai', () => {
    it('should create OpenAI provider config with default model', () => {
      const config = PREDEFINED_PROVIDERS.openai('test-api-key')

      expect(config.id).toBe('openai')
      expect(config.name).toBe('GPT-4o')
      expect(config.baseURL).toBe('https://api.openai.com/v1')
      expect(config.apiKey).toBe('test-api-key')
      expect(config.modelId).toBe('gpt-4o')
    })

    it('should create OpenAI provider config with custom model', () => {
      const config = PREDEFINED_PROVIDERS.openai('test-api-key', 'gpt-4o-mini')

      expect(config.modelId).toBe('gpt-4o-mini')
    })
  })
})
