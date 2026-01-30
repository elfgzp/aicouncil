/**
 * Round Management Module
 * 
 * Handles discussion round lifecycle and message management
 */

import type { Round, RoundStatus, Message, MessageType } from '../types'
import { generateId } from '../utils'

/**
 * Create a new round
 */
export function createRound(roundNumber: number): Round {
  return {
    number: roundNumber,
    status: 'pending',
    messages: [],
    startedAt: new Date(),
  }
}

/**
 * Create a new message
 */
export function createMessage(
  from: string,
  content: string,
  round: number,
  type: MessageType = 'assistant',
  metadata?: Record<string, unknown>
): Message {
  return {
    id: generateId(),
    from,
    content,
    round,
    timestamp: new Date(),
    type,
    metadata,
  }
}

/**
 * Round manager class
 */
export class RoundManager {
  private rounds: Round[] = []
  private currentRoundIndex = -1

  /**
   * Start a new round
   */
  startNewRound(): Round {
    const roundNumber = this.rounds.length + 1
    const round = createRound(roundNumber)
    round.status = 'in_progress'
    this.rounds.push(round)
    this.currentRoundIndex = this.rounds.length - 1
    return round
  }

  /**
   * Get the current round
   */
  getCurrentRound(): Round | null {
    if (this.currentRoundIndex < 0) return null
    return this.rounds[this.currentRoundIndex] ?? null
  }

  /**
   * Get a specific round by number
   */
  getRound(roundNumber: number): Round | null {
    return this.rounds[roundNumber - 1] ?? null
  }

  /**
   * Get all rounds
   */
  getAllRounds(): Round[] {
    return [...this.rounds]
  }

  /**
   * Add a message to the current round
   */
  addMessage(
    from: string,
    content: string,
    type: MessageType = 'assistant',
    metadata?: Record<string, unknown>
  ): Message | null {
    const round = this.getCurrentRound()
    if (!round) return null

    const message = createMessage(from, content, round.number, type, metadata)
    round.messages.push(message)
    return message
  }

  /**
   * Complete the current round
   */
  completeCurrentRound(): Round | null {
    const round = this.getCurrentRound()
    if (!round) return null

    round.status = 'completed'
    round.endedAt = new Date()
    return round
  }

  /**
   * Cancel the current round
   */
  cancelCurrentRound(): Round | null {
    const round = this.getCurrentRound()
    if (!round) return null

    round.status = 'cancelled'
    round.endedAt = new Date()
    return round
  }

  /**
   * Update round status
   */
  updateRoundStatus(roundNumber: number, status: RoundStatus): boolean {
    const round = this.getRound(roundNumber)
    if (!round) return false

    round.status = status
    if (status === 'completed' || status === 'cancelled') {
      round.endedAt = new Date()
    }
    return true
  }

  /**
   * Get all messages from all rounds
   */
  getAllMessages(): Message[] {
    return this.rounds.flatMap(round => round.messages)
  }

  /**
   * Get messages from the current round
   */
  getCurrentRoundMessages(): Message[] {
    const round = this.getCurrentRound()
    return round?.messages ?? []
  }

  /**
   * Get the current round number
   */
  get currentRoundNumber(): number {
    return this.currentRoundIndex + 1
  }

  /**
   * Get total number of rounds
   */
  get totalRounds(): number {
    return this.rounds.length
  }

  /**
   * Check if there's an active round
   */
  get hasActiveRound(): boolean {
    const round = this.getCurrentRound()
    return round?.status === 'in_progress'
  }

  /**
   * Get context from previous rounds for prompts
   */
  getPreviousContext(maxMessages = 10): string {
    const messages = this.getAllMessages()
    const recentMessages = messages.slice(-maxMessages)

    if (recentMessages.length === 0) {
      return 'No previous context.'
    }

    return recentMessages
      .map(m => `[${m.from}]: ${m.content}`)
      .join('\n\n')
  }

  /**
   * Clear all rounds
   */
  clear(): void {
    this.rounds = []
    this.currentRoundIndex = -1
  }
}
