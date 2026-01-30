import { describe, it, expect } from 'vitest'
import { executeModels, modelsInputSchema } from './models'

describe('modelsInputSchema', () => {
  it('should validate empty input', () => {
    const input = {}
    const result = modelsInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })
})

describe('executeModels', () => {
  it('should return list of predefined models', async () => {
    const result = await executeModels({})

    expect(result.predefined).toHaveLength(4)
    expect(result.customSupported).toBe(true)
    expect(result.message).toBeDefined()
  })

  it('should include Kimi model info', async () => {
    const result = await executeModels({})

    const kimi = result.predefined.find(m => m.providerId === 'kimi')
    expect(kimi).toBeDefined()
    expect(kimi?.name).toBe('Kimi For Coding')
    expect(kimi?.defaultModelId).toBe('kimi-for-coding')
    expect(kimi?.requiresApiKey).toBe(true)
  })

  it('should include MiniMax model info', async () => {
    const result = await executeModels({})

    const minimax = result.predefined.find(m => m.providerId === 'minimax')
    expect(minimax).toBeDefined()
    expect(minimax?.name).toBe('MiniMax M2.1')
    expect(minimax?.defaultModelId).toBe('MiniMax-M2.1')
  })

  it('should include Anthropic model info', async () => {
    const result = await executeModels({})

    const anthropic = result.predefined.find(m => m.providerId === 'anthropic')
    expect(anthropic).toBeDefined()
    expect(anthropic?.name).toBe('Claude')
    expect(anthropic?.defaultModelId).toBe('claude-sonnet-4-20250514')
  })

  it('should include OpenAI model info', async () => {
    const result = await executeModels({})

    const openai = result.predefined.find(m => m.providerId === 'openai')
    expect(openai).toBeDefined()
    expect(openai?.name).toBe('GPT-4o')
    expect(openai?.defaultModelId).toBe('gpt-4o')
  })
})
