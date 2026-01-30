import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executeStatus, statusInputSchema } from './status'
import { getCouncil } from '../core/council'

vi.mock('../core/council', async () => {
  const actual = await vi.importActual('../core/council')
  return {
    ...actual,
    getCouncil: vi.fn(),
  }
})

describe('statusInputSchema', () => {
  it('should validate valid input', () => {
    const input = { includeMessages: true }
    const result = statusInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should use default values', () => {
    const input = {}
    const result = statusInputSchema.parse(input)
    expect(result.includeMessages).toBe(false)
  })
})

describe('executeStatus', () => {
  const mockState = {
    id: 'test-council-id',
    status: 'running',
    topic: 'Test Topic',
    currentRound: 2,
    config: { maxRounds: 5 },
    host: { name: 'Host Model', status: 'idle' },
    participants: [
      { name: 'Host Model', status: 'idle', isHost: true },
      { name: 'Participant 1', status: 'thinking', isHost: false },
    ],
    rounds: [
      {
        number: 1,
        messages: [
          { round: 1, from: 'Host', content: 'Hello', timestamp: new Date('2024-01-15T10:00:00Z') },
          { round: 1, from: 'Participant', content: 'Hi', timestamp: new Date('2024-01-15T10:01:00Z') },
        ],
      },
    ],
  }

  const mockCouncil = {
    getState: vi.fn().mockReturnValue(mockState),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCouncil).mockReturnValue(mockCouncil as any)
  })

  it('should return basic status without messages', async () => {
    const result = await executeStatus({ includeMessages: false })

    expect(result.councilId).toBe('test-council-id')
    expect(result.status).toBe('running')
    expect(result.topic).toBe('Test Topic')
    expect(result.currentRound).toBe(2)
    expect(result.maxRounds).toBe(5)
    expect(result.host).toEqual({ name: 'Host Model', status: 'idle' })
    expect(result.participants).toHaveLength(2)
    expect(result.messages).toBeUndefined()
  })

  it('should include messages when requested', async () => {
    const result = await executeStatus({ includeMessages: true })

    expect(result.messages).toBeDefined()
    expect(result.messages).toHaveLength(2)
    expect(result.messages![0]).toMatchObject({
      round: 1,
      from: 'Host',
      content: 'Hello',
    })
  })

  it('should handle missing host', async () => {
    vi.mocked(mockCouncil.getState).mockReturnValue({
      ...mockState,
      host: null,
    })

    const result = await executeStatus({})

    expect(result.host).toBeNull()
  })

  it('should handle empty topic', async () => {
    vi.mocked(mockCouncil.getState).mockReturnValue({
      ...mockState,
      topic: '',
    })

    const result = await executeStatus({})

    expect(result.topic).toBe('No host selected')
  })

  it('should format timestamps as ISO strings', async () => {
    const result = await executeStatus({ includeMessages: true })

    expect(typeof result.messages![0].timestamp).toBe('string')
    expect(result.messages![0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
