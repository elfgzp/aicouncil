import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executeEnd, endInputSchema } from './end'
import { getCouncil } from '../core/council'

vi.mock('../core/council', async () => {
  const actual = await vi.importActual('../core/council')
  return {
    ...actual,
    getCouncil: vi.fn(),
  }
})

describe('endInputSchema', () => {
  it('should validate valid input', () => {
    const input = { generateSummary: true }
    const result = endInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should use default values', () => {
    const input = {}
    const result = endInputSchema.parse(input)
    expect(result.generateSummary).toBe(true)
  })
})

describe('executeEnd', () => {
  const mockState = {
    rounds: [
      { messages: [{}, {}] },
      { messages: [{}] },
    ],
  }

  const mockCouncil = {
    isRunning: true,
    discussionStatus: 'running',
    getState: vi.fn().mockReturnValue(mockState),
    endDiscussion: vi.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCouncil).mockReturnValue(mockCouncil as any)
  })

  it('should return error if no active discussion', async () => {
    vi.mocked(getCouncil).mockReturnValue({
      ...mockCouncil,
      isRunning: false,
      discussionStatus: 'idle',
    } as any)

    const result = await executeEnd({})

    expect(result.success).toBe(false)
    expect(result.message).toContain('No active discussion')
  })

  it('should end discussion', async () => {
    const result = await executeEnd({ generateSummary: false })

    expect(mockCouncil.endDiscussion).toHaveBeenCalled()
    expect(result.success).toBe(true)
    expect(result.totalRounds).toBe(2)
    expect(result.totalMessages).toBe(3)
  })

  it('should generate summary when requested', async () => {
    const result = await executeEnd({ generateSummary: true })

    expect(result.summary).toBeDefined()
    expect(result.summary).toContain('2 rounds')
    expect(result.summary).toContain('3 messages')
  })

  it('should not generate summary when no messages', async () => {
    vi.mocked(mockCouncil.getState).mockReturnValue({ rounds: [] })

    const result = await executeEnd({ generateSummary: true })

    expect(result.summary).toBeUndefined()
  })

  it('should handle paused discussion', async () => {
    vi.mocked(getCouncil).mockReturnValue({
      ...mockCouncil,
      isRunning: false,
      discussionStatus: 'paused',
    } as any)

    const result = await executeEnd({})

    expect(result.success).toBe(true)
  })
})
