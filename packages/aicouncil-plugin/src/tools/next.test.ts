import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executeNext, nextInputSchema } from './next'
import { getCouncil } from '../core/council'

vi.mock('../core/council', async () => {
  const actual = await vi.importActual('../core/council')
  return {
    ...actual,
    getCouncil: vi.fn(),
  }
})

describe('nextInputSchema', () => {
  it('should validate valid input', () => {
    const input = { additionalContext: 'Some context' }
    const result = nextInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should allow empty input', () => {
    const input = {}
    const result = nextInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })
})

describe('executeNext', () => {
  const unsubscribeMock = vi.fn()
  const mockCouncil = {
    isRunning: true,
    isComplete: false,
    currentRound: 1,
    nextRound: vi.fn(),
    on: vi.fn().mockReturnValue(unsubscribeMock),
    participants: [
      { id: 'p1', name: 'Host', isHost: true },
      { id: 'p2', name: 'Participant', isHost: false },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCouncil).mockReturnValue(mockCouncil as any)
  })

  it('should return error if no active discussion', async () => {
    vi.mocked(getCouncil).mockReturnValue({
      ...mockCouncil,
      isRunning: false,
    } as any)

    const result = await executeNext({})

    expect(result.success).toBe(false)
    expect(result.message).toContain('No active discussion')
  })

  it('should proceed to next round', async () => {
    vi.mocked(mockCouncil.nextRound).mockResolvedValue({
      number: 2,
      status: 'completed',
    })

    const result = await executeNext({})

    expect(mockCouncil.nextRound).toHaveBeenCalled()
    expect(result.success).toBe(true)
    expect(result.round).toBe(2)
  })

  it('should return completed message when discussion is complete', async () => {
    vi.mocked(getCouncil).mockReturnValue({
      ...mockCouncil,
      isComplete: true,
    } as any)
    vi.mocked(mockCouncil.nextRound).mockResolvedValue(null)

    const result = await executeNext({})

    expect(result.success).toBe(false)
    expect(result.isComplete).toBe(true)
  })

  it('should handle errors', async () => {
    vi.mocked(mockCouncil.nextRound).mockRejectedValue(new Error('Test error'))

    const result = await executeNext({})

    expect(result.success).toBe(false)
    expect(result.message).toBe('Test error')
  })

  it('should collect responses from messages', async () => {
    vi.mocked(mockCouncil.on).mockImplementation((event, handler) => {
      if (event === 'message:new') {
        handler({ from: 'Host', content: 'Response 1', type: 'assistant' })
        handler({ from: 'Participant', content: 'Response 2', type: 'assistant' })
      }
      return unsubscribeMock
    })

    vi.mocked(mockCouncil.nextRound).mockResolvedValue({
      number: 2,
      status: 'completed',
    })

    const result = await executeNext({})

    expect(result.responses).toHaveLength(2)
  })
})
