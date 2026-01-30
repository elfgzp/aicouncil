import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { executeSetup, setupInputSchema } from './setup'
import { getCouncil, resetCouncil } from '../core/council'

// Mock the council module
vi.mock('../core/council', async () => {
  const actual = await vi.importActual('../core/council')
  return {
    ...actual,
    getCouncil: vi.fn(),
    resetCouncil: vi.fn(),
  }
})

describe('setupInputSchema', () => {
  it('should validate valid input', () => {
    const input = {
      models: [
        { providerId: 'kimi', isHost: true },
        { providerId: 'minimax' },
      ],
      maxRounds: 5,
      locale: 'en' as const,
    }

    const result = setupInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should require at least 2 models', () => {
    const input = {
      models: [{ providerId: 'kimi' }],
    }

    const result = setupInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should use default values', () => {
    const input = {
      models: [
        { providerId: 'kimi' },
        { providerId: 'minimax' },
      ],
    }

    const result = setupInputSchema.parse(input)
    expect(result.maxRounds).toBe(5)
    expect(result.locale).toBe('en')
  })

  it('should accept custom provider config', () => {
    const input = {
      models: [
        {
          providerId: 'custom',
          modelId: 'custom-model',
          name: 'Custom Model',
          apiKey: 'custom-key',
          baseURL: 'https://api.custom.com',
          isHost: true,
        },
        { providerId: 'kimi' },
      ],
    }

    const result = setupInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })
})

describe('executeSetup', () => {
  const mockCouncil = {
    addParticipant: vi.fn(),
    discussionId: 'test-council-id',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCouncil).mockReturnValue(mockCouncil as any)
    vi.mocked(mockCouncil.addParticipant).mockImplementation((provider, options) => ({
      id: `participant-${provider.id}`,
      name: options?.name || provider.name,
      isHost: options?.isHost || false,
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should set up council with predefined providers', async () => {
    const input = {
      models: [
        { providerId: 'kimi', isHost: true },
        { providerId: 'minimax' },
      ],
    }

    const result = await executeSetup(input)

    expect(resetCouncil).toHaveBeenCalled()
    expect(getCouncil).toHaveBeenCalledWith({
      maxRounds: 5,
      locale: 'en',
    })
    expect(result.success).toBe(true)
    expect(result.councilId).toBe('test-council-id')
    expect(result.participants).toHaveLength(2)
  })

  it('should set first model as host if not specified', async () => {
    const input = {
      models: [
        { providerId: 'kimi' },
        { providerId: 'minimax' },
      ],
    }

    await executeSetup(input)

    expect(mockCouncil.addParticipant).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ isHost: true })
    )
  })

  it('should respect specified host', async () => {
    const input = {
      models: [
        { providerId: 'kimi' },
        { providerId: 'minimax', isHost: true },
      ],
    }

    await executeSetup(input)

    expect(mockCouncil.addParticipant).toHaveBeenNthCalledWith(
      1,
      expect.any(Object),
      expect.objectContaining({ isHost: false })
    )
    expect(mockCouncil.addParticipant).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      expect.objectContaining({ isHost: true })
    )
  })

  it('should use custom config', async () => {
    const input = {
      models: [
        { providerId: 'kimi', isHost: true },
        { providerId: 'minimax' },
      ],
      maxRounds: 10,
      locale: 'zh' as const,
    }

    await executeSetup(input)

    expect(getCouncil).toHaveBeenCalledWith({
      maxRounds: 10,
      locale: 'zh',
    })
  })

  it('should use custom name if provided', async () => {
    const input = {
      models: [
        { providerId: 'kimi', isHost: true, name: 'Custom Kimi' },
        { providerId: 'minimax', name: 'Custom MiniMax' },
      ],
    }

    await executeSetup(input)

    expect(mockCouncil.addParticipant).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ name: 'Custom Kimi' }),
      expect.any(Object)
    )
  })

  it('should use API key from context', async () => {
    const getApiKey = vi.fn().mockReturnValue('context-api-key')
    const input = {
      models: [
        { providerId: 'kimi', isHost: true },
        { providerId: 'minimax' },
      ],
    }

    await executeSetup(input, { getApiKey })

    expect(getApiKey).toHaveBeenCalledWith('kimi')
    expect(getApiKey).toHaveBeenCalledWith('minimax')
  })

  it('should handle custom provider with all options', async () => {
    const input = {
      models: [
        {
          providerId: 'custom-provider',
          modelId: 'custom-model',
          name: 'Custom Name',
          apiKey: 'custom-api-key',
          baseURL: 'https://api.custom.com',
          isHost: true,
        },
        { providerId: 'kimi' },
      ],
    }

    const result = await executeSetup(input)

    expect(result.success).toBe(true)
    expect(mockCouncil.addParticipant).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'custom-provider',
        name: 'Custom Name',
        baseURL: 'https://api.custom.com',
        apiKey: 'custom-api-key',
        modelId: 'custom-model',
      }),
      expect.any(Object)
    )
  })
})
