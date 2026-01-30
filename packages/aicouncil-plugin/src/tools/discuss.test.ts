import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { executeDiscuss, discussInputSchema } from './discuss'
import { getCouncil } from '../core/council'

// Mock the council module
vi.mock('../core/council', async () => {
  const actual = await vi.importActual('../core/council')
  return {
    ...actual,
    getCouncil: vi.fn(),
  }
})

describe('discussInputSchema', () => {
  it('should validate valid input', () => {
    const input = {
      topic: 'Test topic',
      continueDiscussion: false,
    }

    const result = discussInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should require topic', () => {
    const input = {
      continueDiscussion: false,
    }

    const result = discussInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should use default values', () => {
    const input = {
      topic: 'Test topic',
    }

    const result = discussInputSchema.parse(input)
    expect(result.continueDiscussion).toBe(false)
  })
})

describe('executeDiscuss', () => {
  const unsubscribeMock = vi.fn()
  const mockCouncil = {
    participants: [
      { id: 'p1', name: 'Host', isHost: true },
      { id: 'p2', name: 'Participant', isHost: false },
    ],
    isRunning: false,
    isComplete: false,
    currentRound: 0,
    startDiscussion: vi.fn(),
    nextRound: vi.fn(),
    on: vi.fn().mockReturnValue(unsubscribeMock),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the on mock to return unsubscribeMock by default
    mockCouncil.on.mockReturnValue(unsubscribeMock)
    vi.mocked(getCouncil).mockReturnValue(mockCouncil as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return error if council not set up', async () => {
    vi.mocked(getCouncil).mockReturnValue({
      ...mockCouncil,
      participants: [],
    } as any)

    const result = await executeDiscuss({ topic: 'Test' })

    expect(result.success).toBe(false)
    expect(result.message).toContain('No active discussion')
  })

  it('should start new discussion', async () => {
    const result = await executeDiscuss({ topic: 'Test topic' })

    expect(mockCouncil.startDiscussion).toHaveBeenCalledWith('Test topic')
    expect(result.success).toBe(true)
    expect(result.round).toBe(0)
  })

  it('should continue existing discussion', async () => {
    vi.mocked(getCouncil).mockReturnValue({
      ...mockCouncil,
      isRunning: true,
      currentRound: 1,
    } as any)

    const result = await executeDiscuss({ topic: 'Test', continueDiscussion: true })

    expect(mockCouncil.nextRound).toHaveBeenCalled()
    expect(result.success).toBe(true)
  })

  it('should collect responses from messages', async () => {
    const messages: any[] = []
    vi.mocked(mockCouncil.on).mockImplementation((event, handler) => {
      if (event === 'message:new') {
        // Simulate receiving messages
        handler({ from: 'Host', content: 'Host response', type: 'assistant' })
        handler({ from: 'Participant', content: 'Participant response', type: 'assistant' })
      }
      return () => {}
    })

    const result = await executeDiscuss({ topic: 'Test' })

    expect(result.responses).toHaveLength(2)
    expect(result.responses[0]).toEqual({
      participant: 'Host',
      content: 'Host response',
      isHost: true,
    })
  })

  it('should handle errors', async () => {
    vi.mocked(mockCouncil.startDiscussion).mockRejectedValue(new Error('Test error'))

    const result = await executeDiscuss({ topic: 'Test' })

    expect(result.success).toBe(false)
    expect(result.message).toBe('Test error')
  })

  it('should unsubscribe from events after execution', async () => {
    const unsubscribe = vi.fn()
    vi.mocked(mockCouncil.on).mockReturnValue(unsubscribe)

    await executeDiscuss({ topic: 'Test' })

    expect(unsubscribe).toHaveBeenCalled()
  })

  it('should only collect assistant messages', async () => {
    vi.mocked(mockCouncil.on).mockImplementation((event, handler) => {
      if (event === 'message:new') {
        handler({ from: 'Host', content: 'Response', type: 'assistant' })
        handler({ from: 'System', content: 'System message', type: 'system' })
        handler({ from: 'User', content: 'User message', type: 'user' })
      }
      return unsubscribeMock
    })

    const result = await executeDiscuss({ topic: 'Test' })

    expect(result.responses).toHaveLength(1)
    expect(result.responses[0].participant).toBe('Host')
  })
})
