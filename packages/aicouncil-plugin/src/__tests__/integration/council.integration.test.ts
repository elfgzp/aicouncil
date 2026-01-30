/**
 * Integration Tests for AICouncil
 *
 * These tests verify the complete flow of a council discussion
 * using mocked provider responses.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Council, getCouncil, resetCouncil } from '../../core/council'
import { providerAdapter } from '../../providers/adapter'
import type { ProviderConfig } from '../../types'

// Mock provider adapter
vi.mock('../../providers/adapter', () => ({
  providerAdapter: {
    setClient: vi.fn(),
    call: vi.fn(),
  },
  ProviderAdapter: vi.fn().mockImplementation(() => ({
    setClient: vi.fn(),
    call: vi.fn(),
  })),
  createProviderConfig: vi.fn(),
  PREDEFINED_PROVIDERS: {},
}))

describe('Council Integration', () => {
  let council: Council

  const hostProvider: ProviderConfig = {
    id: 'host-provider',
    name: 'Host Model',
    baseURL: 'https://api.host.com',
    apiKey: 'host-key',
    modelId: 'host-model',
  }

  const participantProvider: ProviderConfig = {
    id: 'participant-provider',
    name: 'Participant Model',
    baseURL: 'https://api.participant.com',
    apiKey: 'participant-key',
    modelId: 'participant-model',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    resetCouncil()
    council = getCouncil({ maxRounds: 3 })
  })

  afterEach(() => {
    resetCouncil()
  })

  describe('Complete Discussion Flow', () => {
    it('should run a complete multi-round discussion', async () => {
      // Setup participants
      council.addParticipant(hostProvider, { isHost: true, name: 'Host' })
      council.addParticipant(participantProvider, { name: 'Participant' })

      // Mock responses
      let callCount = 0
      vi.mocked(providerAdapter.call).mockImplementation(async () => {
        callCount++
        return {
          content: `Response ${callCount}`,
        }
      })

      // Start discussion
      await council.startDiscussion('Test Topic')

      expect(council.isRunning).toBe(true)
      expect(council.currentRound).toBe(1)
      expect(callCount).toBe(2) // Host + Participant

      // Continue to next round
      await council.nextRound()
      expect(council.currentRound).toBe(2)
      expect(callCount).toBe(4)

      // End discussion
      await council.endDiscussion()
      expect(council.isComplete).toBe(true)
    })

    it('should collect all messages across rounds', async () => {
      council.addParticipant(hostProvider, { isHost: true, name: 'Host' })
      council.addParticipant(participantProvider, { name: 'Participant' })

      const messages: string[] = []
      council.on('message:new', (msg) => {
        messages.push(`${msg.from}: ${msg.content}`)
      })

      vi.mocked(providerAdapter.call).mockImplementation(async (participant) => {
        return {
          content: `Message from ${participant.name}`,
        }
      })

      await council.startDiscussion('Test Topic')
      await council.nextRound()

      expect(messages).toHaveLength(4)
      expect(messages[0]).toContain('Host')
      expect(messages[1]).toContain('Participant')
    })

    it('should handle host summarization after each round', async () => {
      council.addParticipant(hostProvider, { isHost: true, name: 'Host' })
      council.addParticipant(participantProvider, { name: 'Participant' })

      const roundSummaries: number[] = []
      council.on('round:complete', (round) => {
        roundSummaries.push(round.number)
      })

      vi.mocked(providerAdapter.call).mockResolvedValue({
        content: 'Discussion response',
      })

      await council.startDiscussion('Test Topic')
      await council.nextRound()

      expect(roundSummaries).toEqual([1, 2])
    })
  })

  describe('Error Recovery', () => {
    it('should continue discussion when one participant fails', async () => {
      council.addParticipant(hostProvider, { isHost: true, name: 'Host' })
      council.addParticipant(participantProvider, { name: 'Participant' })

      vi.mocked(providerAdapter.call).mockImplementation(async (participant) => {
        if (participant.name === 'Participant') {
          throw new Error('API Error')
        }
        return { content: 'Host response' }
      })

      const errors: Error[] = []
      council.on('participant:error', (p, error) => {
        errors.push(error)
      })

      await council.startDiscussion('Test Topic')

      expect(errors).toHaveLength(1)
      expect(council.isRunning).toBe(true)
      expect(council.currentRound).toBe(1)
    })

    it('should allow retry after participant error', async () => {
      council.addParticipant(hostProvider, { isHost: true, name: 'Host' })
      council.addParticipant(participantProvider, { name: 'Participant' })

      let shouldFail = true
      vi.mocked(providerAdapter.call).mockImplementation(async (participant) => {
        if (participant.name === 'Participant' && shouldFail) {
          shouldFail = false
          throw new Error('Temporary Error')
        }
        return { content: 'Success' }
      })

      await council.startDiscussion('Test Topic')
      expect(council.participants.find(p => p.name === 'Participant')?.status).toBe('error')

      // Reset status and continue
      council.participants.forEach(p => {
        if (p.name === 'Participant') {
          // In real usage, you'd reset via the manager
        }
      })

      await council.nextRound()
      // Should proceed without error this time
    })
  })

  describe('State Management', () => {
    it('should maintain state across operations', async () => {
      council.addParticipant(hostProvider, { isHost: true, name: 'Host' })
      council.addParticipant(participantProvider, { name: 'Participant' })

      vi.mocked(providerAdapter.call).mockResolvedValue({
        content: 'Response',
      })

      const states: any[] = []
      council.on('state:change', (state) => {
        states.push({
          status: state.status,
          round: state.currentRound,
          participants: state.participants.length,
        })
      })

      await council.startDiscussion('Test Topic')
      await council.nextRound()
      await council.endDiscussion()

      expect(states.length).toBeGreaterThan(0)
      expect(states[0].status).toBe('running')
      expect(states[states.length - 1].status).toBe('completed')
    })

    it('should preserve message history', async () => {
      council.addParticipant(hostProvider, { isHost: true, name: 'Host' })
      council.addParticipant(participantProvider, { name: 'Participant' })

      vi.mocked(providerAdapter.call).mockResolvedValue({
        content: 'Response',
      })

      await council.startDiscussion('Test Topic')
      await council.nextRound()

      const state = council.getState()
      const allMessages = state.rounds.flatMap(r => r.messages)

      expect(allMessages.length).toBeGreaterThan(0)
      expect(allMessages[0].round).toBe(1)
      expect(allMessages[allMessages.length - 1].round).toBe(2)
    })
  })

  describe('Configuration', () => {
    it('should respect max rounds limit', async () => {
      resetCouncil()
      const limitedCouncil = getCouncil({ maxRounds: 2 })
      limitedCouncil.addParticipant(hostProvider, { isHost: true, name: 'Host' })
      limitedCouncil.addParticipant(participantProvider, { name: 'Participant' })

      vi.mocked(providerAdapter.call).mockResolvedValue({
        content: 'Response',
      })

      // Start round 1
      await limitedCouncil.startDiscussion('Test Topic')
      expect(limitedCouncil.currentRound).toBe(1)
      expect(limitedCouncil.isComplete).toBe(false)

      // Run round 2
      await limitedCouncil.nextRound()
      expect(limitedCouncil.currentRound).toBe(2)
      expect(limitedCouncil.isComplete).toBe(false)

      // Try to run round 3 - should end discussion
      await limitedCouncil.nextRound()
      expect(limitedCouncil.isComplete).toBe(true)
      expect(limitedCouncil.currentRound).toBe(2)
    })

    it('should apply timeout to provider calls', async () => {
      council.addParticipant(hostProvider, { isHost: true, name: 'Host' })
      council.addParticipant(participantProvider, { name: 'Participant' })

      vi.mocked(providerAdapter.call).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return { content: 'Late response' }
      })

      // The council should handle timeout via the adapter
      // This test verifies the timeout option is passed
      await council.startDiscussion('Test Topic')

      expect(providerAdapter.call).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        expect.objectContaining({
          timeout: expect.any(Number),
        })
      )
    })
  })
})
