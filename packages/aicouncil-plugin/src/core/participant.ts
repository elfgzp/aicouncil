/**
 * Participant Management Module
 * 
 * Handles participant lifecycle and state management
 */

import type { Participant, ParticipantStatus, ProviderConfig } from '../types'
import { generateId } from '../utils'

/**
 * Create a new participant
 */
export function createParticipant(
  provider: ProviderConfig,
  options: {
    isHost?: boolean
    name?: string
  } = {}
): Participant {
  return {
    id: generateId(),
    name: options.name ?? provider.name,
    provider,
    isHost: options.isHost ?? false,
    status: 'idle',
  }
}

/**
 * Update participant status
 */
export function updateParticipantStatus(
  participant: Participant,
  status: ParticipantStatus
): Participant {
  return {
    ...participant,
    status,
  }
}

/**
 * Set participant as host
 */
export function setAsHost(participant: Participant): Participant {
  return {
    ...participant,
    isHost: true,
  }
}

/**
 * Remove host status from participant
 */
export function removeHostStatus(participant: Participant): Participant {
  return {
    ...participant,
    isHost: false,
  }
}

/**
 * Participant manager class
 */
export class ParticipantManager {
  private participants: Map<string, Participant> = new Map()
  private hostId: string | null = null

  /**
   * Add a participant
   */
  add(provider: ProviderConfig, options?: { isHost?: boolean; name?: string }): Participant {
    const participant = createParticipant(provider, options)
    this.participants.set(participant.id, participant)

    if (options?.isHost) {
      this.setHost(participant.id)
    }

    return participant
  }

  /**
   * Remove a participant
   */
  remove(participantId: string): boolean {
    if (this.hostId === participantId) {
      this.hostId = null
    }
    return this.participants.delete(participantId)
  }

  /**
   * Get a participant by ID
   */
  get(participantId: string): Participant | undefined {
    return this.participants.get(participantId)
  }

  /**
   * Get all participants
   */
  getAll(): Participant[] {
    return Array.from(this.participants.values())
  }

  /**
   * Get non-host participants
   */
  getNonHost(): Participant[] {
    return this.getAll().filter(p => !p.isHost)
  }

  /**
   * Get the host participant
   */
  getHost(): Participant | null {
    if (!this.hostId) return null
    return this.participants.get(this.hostId) ?? null
  }

  /**
   * Set a participant as host
   */
  setHost(participantId: string): boolean {
    const participant = this.participants.get(participantId)
    if (!participant) return false

    // Remove host status from current host
    if (this.hostId && this.hostId !== participantId) {
      const currentHost = this.participants.get(this.hostId)
      if (currentHost) {
        this.participants.set(this.hostId, removeHostStatus(currentHost))
      }
    }

    // Set new host
    this.hostId = participantId
    this.participants.set(participantId, setAsHost(participant))
    return true
  }

  /**
   * Update participant status
   */
  updateStatus(participantId: string, status: ParticipantStatus): boolean {
    const participant = this.participants.get(participantId)
    if (!participant) return false

    this.participants.set(participantId, updateParticipantStatus(participant, status))
    return true
  }

  /**
   * Reset all participants to idle
   */
  resetAllStatus(): void {
    for (const [id, participant] of this.participants) {
      this.participants.set(id, updateParticipantStatus(participant, 'idle'))
    }
  }

  /**
   * Get participant count
   */
  get count(): number {
    return this.participants.size
  }

  /**
   * Check if there's a host
   */
  get hasHost(): boolean {
    return this.hostId !== null
  }

  /**
   * Clear all participants
   */
  clear(): void {
    this.participants.clear()
    this.hostId = null
  }

  /**
   * Get participant names as a formatted string
   */
  getParticipantNames(excludeHost = false): string {
    const participants = excludeHost ? this.getNonHost() : this.getAll()
    return participants.map(p => p.name).join(', ')
  }
}
