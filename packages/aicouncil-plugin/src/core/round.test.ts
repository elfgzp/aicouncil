import { describe, it, expect, beforeEach } from 'vitest'
import {
  createRound,
  createMessage,
  RoundManager,
} from './round'
import type { MessageType } from '../types'

describe('createRound', () => {
  it('should create a round with given number', () => {
    const round = createRound(1)

    expect(round.number).toBe(1)
    expect(round.status).toBe('pending')
    expect(round.messages).toEqual([])
    expect(round.startedAt).toBeInstanceOf(Date)
    expect(round.endedAt).toBeUndefined()
  })
})

describe('createMessage', () => {
  it('should create a message with required fields', () => {
    const message = createMessage('Alice', 'Hello', 1)

    expect(message.id).toBeDefined()
    expect(message.from).toBe('Alice')
    expect(message.content).toBe('Hello')
    expect(message.round).toBe(1)
    expect(message.type).toBe('assistant')
    expect(message.timestamp).toBeInstanceOf(Date)
  })

  it('should create a message with custom type', () => {
    const message = createMessage('System', 'Round started', 1, 'system')

    expect(message.type).toBe('system')
  })

  it('should create a message with metadata', () => {
    const metadata = { participantId: '123', isHost: true }
    const message = createMessage('Alice', 'Hello', 1, 'assistant', metadata)

    expect(message.metadata).toEqual(metadata)
  })
})

describe('RoundManager', () => {
  let manager: RoundManager

  beforeEach(() => {
    manager = new RoundManager()
  })

  describe('startNewRound', () => {
    it('should start the first round', () => {
      const round = manager.startNewRound()

      expect(round.number).toBe(1)
      expect(round.status).toBe('in_progress')
      expect(manager.currentRoundNumber).toBe(1)
      expect(manager.totalRounds).toBe(1)
    })

    it('should start subsequent rounds', () => {
      manager.startNewRound()
      const round2 = manager.startNewRound()

      expect(round2.number).toBe(2)
      expect(manager.currentRoundNumber).toBe(2)
      expect(manager.totalRounds).toBe(2)
    })
  })

  describe('getCurrentRound', () => {
    it('should return null when no rounds exist', () => {
      expect(manager.getCurrentRound()).toBeNull()
    })

    it('should return the current round', () => {
      const round = manager.startNewRound()
      expect(manager.getCurrentRound()).toBe(round)
    })
  })

  describe('getRound', () => {
    it('should get a specific round by number', () => {
      manager.startNewRound()
      manager.startNewRound()

      const round = manager.getRound(1)
      expect(round?.number).toBe(1)
    })

    it('should return null for non-existent round', () => {
      expect(manager.getRound(999)).toBeNull()
    })
  })

  describe('getAllRounds', () => {
    it('should return all rounds', () => {
      manager.startNewRound()
      manager.startNewRound()

      const rounds = manager.getAllRounds()
      expect(rounds).toHaveLength(2)
    })

    it('should return a copy of rounds array', () => {
      manager.startNewRound()
      const rounds = manager.getAllRounds()
      rounds.push(createRound(999))

      expect(manager.getAllRounds()).toHaveLength(1)
    })
  })

  describe('addMessage', () => {
    it('should add a message to current round', () => {
      manager.startNewRound()
      const message = manager.addMessage('Alice', 'Hello')

      expect(message).not.toBeNull()
      expect(message?.from).toBe('Alice')
      expect(message?.content).toBe('Hello')
      expect(manager.getCurrentRoundMessages()).toHaveLength(1)
    })

    it('should return null when no active round', () => {
      const message = manager.addMessage('Alice', 'Hello')
      expect(message).toBeNull()
    })

    it('should add message with metadata', () => {
      manager.startNewRound()
      const message = manager.addMessage('Alice', 'Hello', 'assistant', { key: 'value' })

      expect(message?.metadata).toEqual({ key: 'value' })
    })
  })

  describe('completeCurrentRound', () => {
    it('should complete the current round', () => {
      manager.startNewRound()
      const completed = manager.completeCurrentRound()

      expect(completed?.status).toBe('completed')
      expect(completed?.endedAt).toBeInstanceOf(Date)
    })

    it('should return null when no active round', () => {
      const completed = manager.completeCurrentRound()
      expect(completed).toBeNull()
    })
  })

  describe('cancelCurrentRound', () => {
    it('should cancel the current round', () => {
      manager.startNewRound()
      const cancelled = manager.cancelCurrentRound()

      expect(cancelled?.status).toBe('cancelled')
      expect(cancelled?.endedAt).toBeInstanceOf(Date)
    })
  })

  describe('updateRoundStatus', () => {
    it('should update round status', () => {
      manager.startNewRound()
      const result = manager.updateRoundStatus(1, 'completed')

      expect(result).toBe(true)
      expect(manager.getRound(1)?.status).toBe('completed')
    })

    it('should set endedAt for completed/cancelled status', () => {
      manager.startNewRound()
      manager.updateRoundStatus(1, 'completed')

      expect(manager.getRound(1)?.endedAt).toBeInstanceOf(Date)
    })

    it('should return false for non-existent round', () => {
      const result = manager.updateRoundStatus(999, 'completed')
      expect(result).toBe(false)
    })
  })

  describe('getAllMessages', () => {
    it('should return all messages from all rounds', () => {
      manager.startNewRound()
      manager.addMessage('Alice', 'Hello round 1')
      manager.completeCurrentRound()

      manager.startNewRound()
      manager.addMessage('Bob', 'Hello round 2')

      const messages = manager.getAllMessages()
      expect(messages).toHaveLength(2)
    })

    it('should return empty array when no rounds', () => {
      expect(manager.getAllMessages()).toEqual([])
    })
  })

  describe('getCurrentRoundMessages', () => {
    it('should return messages from current round only', () => {
      manager.startNewRound()
      manager.addMessage('Alice', 'Round 1')
      manager.completeCurrentRound()

      manager.startNewRound()
      manager.addMessage('Bob', 'Round 2')

      const messages = manager.getCurrentRoundMessages()
      expect(messages).toHaveLength(1)
      expect(messages[0].from).toBe('Bob')
    })

    it('should return empty array when no active round', () => {
      expect(manager.getCurrentRoundMessages()).toEqual([])
    })
  })

  describe('hasActiveRound', () => {
    it('should return true when round is in progress', () => {
      manager.startNewRound()
      expect(manager.hasActiveRound).toBe(true)
    })

    it('should return false when no rounds', () => {
      expect(manager.hasActiveRound).toBe(false)
    })

    it('should return false when round is completed', () => {
      manager.startNewRound()
      manager.completeCurrentRound()
      expect(manager.hasActiveRound).toBe(false)
    })
  })

  describe('getPreviousContext', () => {
    it('should return context from previous messages', () => {
      manager.startNewRound()
      manager.addMessage('Alice', 'First message')
      manager.addMessage('Bob', 'Second message')
      manager.completeCurrentRound()

      const context = manager.getPreviousContext()
      expect(context).toContain('Alice')
      expect(context).toContain('First message')
      expect(context).toContain('Bob')
      expect(context).toContain('Second message')
    })

    it('should return default message when no messages', () => {
      const context = manager.getPreviousContext()
      expect(context).toBe('No previous context.')
    })

    it('should limit to max messages', () => {
      manager.startNewRound()
      for (let i = 0; i < 15; i++) {
        manager.addMessage('User', `Message ${i}`)
      }

      const context = manager.getPreviousContext(5)
      const lines = context.split('\n\n')
      expect(lines.length).toBe(5)
    })
  })

  describe('clear', () => {
    it('should remove all rounds', () => {
      manager.startNewRound()
      manager.startNewRound()
      manager.clear()

      expect(manager.totalRounds).toBe(0)
      expect(manager.currentRoundNumber).toBe(0)
      expect(manager.getCurrentRound()).toBeNull()
    })
  })
})
