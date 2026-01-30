import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Council, getCouncil, resetCouncil } from './council'
import { providerAdapter } from '../providers/adapter'
import type { ProviderConfig } from '../types'

// Mock the provider adapter
vi.mock('../providers/adapter', () => ({
  providerAdapter: {
    setClient: vi.fn(),
    call: vi.fn(),
  },
  ProviderAdapter: vi.fn(),
}))

const mockProvider1: ProviderConfig = {
  id: 'test-provider-1',
  name: 'Test Provider 1',
  baseURL: 'https://api.test1.com',
  apiKey: 'test-key-1',
  modelId: 'test-model-1',
}

const mockProvider2: ProviderConfig = {
  id: 'test-provider-2',
  name: 'Test Provider 2',
  baseURL: 'https://api.test2.com',
  apiKey: 'test-key-2',
  modelId: 'test-model-2',
}

describe('Council', () => {
  let council: Council

  beforeEach(() => {
    vi.clearAllMocks()
    resetCouncil()
    council = getCouncil()
  })

  afterEach(() => {
    resetCouncil()
  })

  describe('initialization', () => {
    it('should create council with default config', () => {
      const state = council.getState()

      expect(state.id).toBeDefined()
      expect(state.status).toBe('idle')
      expect(state.config.maxRounds).toBe(5)
      expect(state.config.responseTimeout).toBe(120000)
      expect(state.config.locale).toBe('en')
    })

    it('should create council with custom config', () => {
      resetCouncil()
      const customCouncil = getCouncil({
        maxRounds: 10,
        responseTimeout: 60000,
        locale: 'zh',
      })

      const state = customCouncil.getState()
      expect(state.config.maxRounds).toBe(10)
      expect(state.config.responseTimeout).toBe(60000)
      expect(state.config.locale).toBe('zh')
    })
  })

  describe('addParticipant', () => {
    it('should add participants', () => {
      const p1 = council.addParticipant(mockProvider1)
      const p2 = council.addParticipant(mockProvider2)

      expect(council.participants).toHaveLength(2)
      expect(council.participants.map(p => p.id)).toContain(p1.id)
      expect(council.participants.map(p => p.id)).toContain(p2.id)
    })

    it('should add participant as host', () => {
      const host = council.addParticipant(mockProvider1, { isHost: true })

      expect(host.isHost).toBe(true)
      expect(council.host?.id).toBe(host.id)
    })
  })

  describe('removeParticipant', () => {
    it('should remove a participant', () => {
      const p1 = council.addParticipant(mockProvider1)
      council.addParticipant(mockProvider2)

      const result = council.removeParticipant(p1.id)

      expect(result).toBe(true)
      expect(council.participants).toHaveLength(1)
    })

    it('should return false for non-existent participant', () => {
      const result = council.removeParticipant('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('setHost', () => {
    it('should set a participant as host', () => {
      const p1 = council.addParticipant(mockProvider1)
      council.addParticipant(mockProvider2)

      const result = council.setHost(p1.id)

      expect(result).toBe(true)
      expect(council.host?.id).toBe(p1.id)
    })

    it('should return false for non-existent participant', () => {
      const result = council.setHost('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('startDiscussion', () => {
    beforeEach(() => {
      council.addParticipant(mockProvider1, { isHost: true })
      council.addParticipant(mockProvider2)
    })

    it('should throw error if less than 2 participants', async () => {
      resetCouncil()
      const smallCouncil = getCouncil()
      smallCouncil.addParticipant(mockProvider1, { isHost: true })

      await expect(smallCouncil.startDiscussion('Test topic')).rejects.toThrow()
    })

    it('should throw error if no host', async () => {
      resetCouncil()
      const noHostCouncil = getCouncil()
      noHostCouncil.addParticipant(mockProvider1)
      noHostCouncil.addParticipant(mockProvider2)

      await expect(noHostCouncil.startDiscussion('Test topic')).rejects.toThrow()
    })

    it('should throw error if discussion already running', async () => {
      vi.mocked(providerAdapter.call).mockResolvedValue({ content: 'Response' })

      await council.startDiscussion('Test topic')
      await expect(council.startDiscussion('Another topic')).rejects.toThrow()
    })

    it('should start discussion and run first round', async () => {
      vi.mocked(providerAdapter.call).mockResolvedValue({ content: 'Test response' })

      await council.startDiscussion('Test topic')

      expect(council.isRunning).toBe(true)
      expect(council.discussionTopic).toBe('Test topic')
      expect(council.currentRound).toBe(1)
      expect(council.totalRounds).toBe(1)
    })
  })

  describe('nextRound', () => {
    beforeEach(() => {
      council.addParticipant(mockProvider1, { isHost: true })
      council.addParticipant(mockProvider2)
    })

    it('should throw error if no active discussion', async () => {
      await expect(council.nextRound()).rejects.toThrow('No active discussion')
    })

    it('should proceed to next round', async () => {
      vi.mocked(providerAdapter.call).mockResolvedValue({ content: 'Test response' })

      await council.startDiscussion('Test topic')
      const round = await council.nextRound()

      expect(round?.number).toBe(2)
      expect(council.currentRound).toBe(2)
    })

    it('should end discussion when max rounds reached', async () => {
      resetCouncil()
      const limitedCouncil = getCouncil({ maxRounds: 2 })
      limitedCouncil.addParticipant(mockProvider1, { isHost: true })
      limitedCouncil.addParticipant(mockProvider2)

      vi.mocked(providerAdapter.call).mockResolvedValue({ content: 'Test response' })

      // Start round 1
      await limitedCouncil.startDiscussion('Test topic')
      expect(limitedCouncil.currentRound).toBe(1)
      expect(limitedCouncil.isComplete).toBe(false)

      // Run round 2
      await limitedCouncil.nextRound()
      expect(limitedCouncil.currentRound).toBe(2)
      expect(limitedCouncil.isComplete).toBe(false)

      // Try to run round 3 - should end discussion
      await limitedCouncil.nextRound()
      expect(limitedCouncil.isComplete).toBe(true)
    })
  })

  describe('endDiscussion', () => {
    beforeEach(() => {
      council.addParticipant(mockProvider1, { isHost: true })
      council.addParticipant(mockProvider2)
    })

    it('should end running discussion', async () => {
      vi.mocked(providerAdapter.call).mockResolvedValue({ content: 'Test response' })

      await council.startDiscussion('Test topic')
      await council.endDiscussion()

      expect(council.isComplete).toBe(true)
      expect(council.isRunning).toBe(false)
    })

    it('should do nothing if no active discussion', async () => {
      await council.endDiscussion()
      expect(council.discussionStatus).toBe('idle')
    })
  })

  describe('pause and resume', () => {
    beforeEach(() => {
      council.addParticipant(mockProvider1, { isHost: true })
      council.addParticipant(mockProvider2)
    })

    it('should pause running discussion', async () => {
      vi.mocked(providerAdapter.call).mockResolvedValue({ content: 'Test response' })

      await council.startDiscussion('Test topic')
      council.pause()

      expect(council.discussionStatus).toBe('paused')
    })

    it('should resume paused discussion', async () => {
      vi.mocked(providerAdapter.call).mockResolvedValue({ content: 'Test response' })

      await council.startDiscussion('Test topic')
      council.pause()
      council.resume()

      expect(council.discussionStatus).toBe('running')
    })
  })

  describe('reset', () => {
    it('should reset council to initial state', async () => {
      council.addParticipant(mockProvider1, { isHost: true })
      council.addParticipant(mockProvider2)

      vi.mocked(providerAdapter.call).mockResolvedValue({ content: 'Test response' })
      await council.startDiscussion('Test topic')

      council.reset()

      expect(council.participants).toHaveLength(0)
      expect(council.discussionStatus).toBe('idle')
      expect(council.currentRound).toBe(0)
      expect(council.discussionTopic).toBe('')
    })
  })

  describe('events', () => {
    beforeEach(() => {
      council.addParticipant(mockProvider1, { isHost: true })
      council.addParticipant(mockProvider2)
    })

    it('should emit state change events', async () => {
      const handler = vi.fn()
      council.on('state:change', handler)

      vi.mocked(providerAdapter.call).mockResolvedValue({ content: 'Test response' })
      await council.startDiscussion('Test topic')

      expect(handler).toHaveBeenCalled()
    })

    it('should emit discussion start event', async () => {
      const handler = vi.fn()
      council.on('discussion:start', handler)

      vi.mocked(providerAdapter.call).mockResolvedValue({ content: 'Test response' })
      await council.startDiscussion('Test topic')

      expect(handler).toHaveBeenCalled()
    })

    it('should emit round events', async () => {
      const startHandler = vi.fn()
      const completeHandler = vi.fn()
      council.on('round:start', startHandler)
      council.on('round:complete', completeHandler)

      vi.mocked(providerAdapter.call).mockResolvedValue({ content: 'Test response' })
      await council.startDiscussion('Test topic')

      expect(startHandler).toHaveBeenCalled()
      expect(completeHandler).toHaveBeenCalled()
    })

    it('should emit message events', async () => {
      const handler = vi.fn()
      council.on('message:new', handler)

      vi.mocked(providerAdapter.call).mockResolvedValue({ content: 'Test response' })
      await council.startDiscussion('Test topic')

      expect(handler).toHaveBeenCalled()
    })

    it('should allow unsubscribing from events', async () => {
      const handler = vi.fn()
      const unsubscribe = council.on('state:change', handler)

      unsubscribe()

      vi.mocked(providerAdapter.call).mockResolvedValue({ content: 'Test response' })
      await council.startDiscussion('Test topic')

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('setCallbacks', () => {
    beforeEach(() => {
      council.addParticipant(mockProvider1, { isHost: true })
      council.addParticipant(mockProvider2)
    })

    it('should set up all callbacks', async () => {
      const callbacks = {
        onStateChange: vi.fn(),
        onMessage: vi.fn(),
        onThinking: vi.fn(),
        onResponse: vi.fn(),
        onError: vi.fn(),
        onRoundComplete: vi.fn(),
      }

      council.setCallbacks(callbacks)

      vi.mocked(providerAdapter.call).mockResolvedValue({ content: 'Test response' })
      await council.startDiscussion('Test topic')

      expect(callbacks.onStateChange).toHaveBeenCalled()
      expect(callbacks.onMessage).toHaveBeenCalled()
      expect(callbacks.onResponse).toHaveBeenCalled()
      expect(callbacks.onRoundComplete).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      council.addParticipant(mockProvider1, { isHost: true })
      council.addParticipant(mockProvider2)
    })

    it('should handle provider errors gracefully', async () => {
      const errorHandler = vi.fn()
      council.on('participant:error', errorHandler)

      vi.mocked(providerAdapter.call).mockRejectedValue(new Error('API Error'))

      await council.startDiscussion('Test topic')

      expect(errorHandler).toHaveBeenCalled()
    })

    it('should update participant status on error', async () => {
      vi.mocked(providerAdapter.call).mockRejectedValue(new Error('API Error'))

      await council.startDiscussion('Test topic')

      const errorParticipant = council.participants.find(p => p.status === 'error')
      expect(errorParticipant).toBeDefined()
    })
  })
})

describe('getCouncil', () => {
  beforeEach(() => {
    resetCouncil()
  })

  it('should return singleton instance', () => {
    const c1 = getCouncil()
    const c2 = getCouncil()

    expect(c1).toBe(c2)
  })

  it('should create new instance after reset', () => {
    const c1 = getCouncil()
    resetCouncil()
    const c2 = getCouncil()

    expect(c1).not.toBe(c2)
  })
})
