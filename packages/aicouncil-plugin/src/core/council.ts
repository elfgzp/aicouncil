/**
 * Council Core Module
 * 
 * Main orchestration logic for multi-model discussions
 */

import type {
  DiscussionState,
  DiscussionStatus,
  DiscussionConfig,
  Participant,
  Message,
  Round,
  CouncilCallbacks,
  ProviderConfig,
  DEFAULT_CONFIG,
} from '../types'
import { ParticipantManager } from './participant'
import { RoundManager } from './round'
import { providerAdapter, type OpencodeClient } from '../providers/adapter'
import { t, setLocale } from '../i18n'
import { generateId, createEventEmitter } from '../utils'

/**
 * Council events
 */
type CouncilEvents = {
  'state:change': [DiscussionState]
  'message:new': [Message]
  'participant:thinking': [Participant]
  'participant:response': [Participant, string]
  'participant:error': [Participant, Error]
  'round:start': [Round]
  'round:complete': [Round]
  'discussion:start': [DiscussionState]
  'discussion:end': [DiscussionState]
} & Record<string, unknown[]>

/**
 * Council class - main orchestrator
 */
export class Council {
  private id: string
  private topic = ''
  private status: DiscussionStatus = 'idle'
  private config: DiscussionConfig
  private participantManager: ParticipantManager
  private roundManager: RoundManager
  private events = createEventEmitter<CouncilEvents>()
  private startedAt: Date | null = null
  private endedAt: Date | null = null

  constructor(config: Partial<DiscussionConfig> = {}) {
    this.id = generateId()
    this.config = {
      maxRounds: config.maxRounds ?? 5,
      responseTimeout: config.responseTimeout ?? 120000,
      autoSummarize: config.autoSummarize ?? false,
      locale: config.locale ?? 'en',
    }
    this.participantManager = new ParticipantManager()
    this.roundManager = new RoundManager()

    // Set locale
    setLocale(this.config.locale)
  }

  /**
   * Initialize with OpenCode client
   */
  initialize(client: OpencodeClient): void {
    providerAdapter.setClient(client)
  }

  /**
   * Add a participant to the council
   */
  addParticipant(provider: ProviderConfig, options?: { isHost?: boolean; name?: string }): Participant {
    const participant = this.participantManager.add(provider, options)
    this.emitStateChange()
    return participant
  }

  /**
   * Remove a participant from the council
   */
  removeParticipant(participantId: string): boolean {
    const result = this.participantManager.remove(participantId)
    this.emitStateChange()
    return result
  }

  /**
   * Set a participant as host
   */
  setHost(participantId: string): boolean {
    const result = this.participantManager.setHost(participantId)
    this.emitStateChange()
    return result
  }

  /**
   * Get current state
   */
  getState(): DiscussionState {
    return {
      id: this.id,
      topic: this.topic,
      participants: this.participantManager.getAll(),
      host: this.participantManager.getHost(),
      rounds: this.roundManager.getAllRounds(),
      currentRound: this.roundManager.currentRoundNumber,
      status: this.status,
      startedAt: this.startedAt ?? new Date(),
      endedAt: this.endedAt ?? undefined,
      config: this.config,
    }
  }

  /**
   * Start a discussion with a topic
   */
  async startDiscussion(topic: string): Promise<void> {
    if (this.status === 'running') {
      throw new Error(t('errors.discussionAlreadyRunning'))
    }

    if (this.participantManager.count < 2) {
      throw new Error(t('setup.minModelsRequired'))
    }

    if (!this.participantManager.hasHost) {
      throw new Error(t('setup.hostRequired'))
    }

    this.topic = topic
    this.status = 'running'
    this.startedAt = new Date()
    this.events.emit('discussion:start', this.getState())
    this.emitStateChange()

    // Start first round
    await this.runRound()
  }

  /**
   * Run a single round of discussion
   */
  async runRound(): Promise<Round | null> {
    if (this.status !== 'running') {
      return null
    }

    // Check max rounds
    if (this.roundManager.totalRounds >= this.config.maxRounds) {
      await this.endDiscussion()
      return null
    }

    // Start new round
    const round = this.roundManager.startNewRound()
    this.events.emit('round:start', round)
    this.emitStateChange()

    // Get context from previous rounds
    const context = this.roundManager.getPreviousContext()

    // Build prompt for this round
    const roundPrompt = t('prompts.roundStartPrompt', {
      round: round.number.toString(),
      topic: this.topic,
      context,
    })

    // Get host and participants
    const host = this.participantManager.getHost()!
    const participants = this.participantManager.getNonHost()

    // Host opens the round
    await this.getParticipantResponse(host, roundPrompt, true)

    // Each participant responds
    for (const participant of participants) {
      await this.getParticipantResponse(participant, roundPrompt, false)
    }

    // Complete the round
    const completedRound = this.roundManager.completeCurrentRound()
    if (completedRound) {
      this.events.emit('round:complete', completedRound)
    }

    this.emitStateChange()
    return completedRound
  }

  /**
   * Get response from a participant
   */
  private async getParticipantResponse(
    participant: Participant,
    prompt: string,
    isHost: boolean
  ): Promise<void> {
    // Update status to thinking
    this.participantManager.updateStatus(participant.id, 'thinking')
    this.events.emit('participant:thinking', participant)
    this.emitStateChange()

    try {
      // Build system prompt
      const systemPrompt = isHost
        ? t('prompts.hostSystemPrompt', {
            participants: this.participantManager.getParticipantNames(true),
            topic: this.topic,
          })
        : t('prompts.participantSystemPrompt', {
            host: this.participantManager.getHost()?.name ?? '',
            participants: this.participantManager.getParticipantNames(true),
            topic: this.topic,
          })

      // Call the model
      const response = await providerAdapter.call(participant, prompt, {
        systemPrompt,
        timeout: this.config.responseTimeout,
      })

      // Update status
      this.participantManager.updateStatus(participant.id, 'idle')

      // Add message to round
      const message = this.roundManager.addMessage(
        participant.name,
        response.content,
        'assistant',
        { participantId: participant.id, isHost }
      )

      if (message) {
        this.events.emit('message:new', message)
      }

      this.events.emit('participant:response', participant, response.content)
    } catch (error) {
      this.participantManager.updateStatus(participant.id, 'error')
      const err = error instanceof Error ? error : new Error(String(error))
      this.events.emit('participant:error', participant, err)

      // Add error message
      this.roundManager.addMessage(
        participant.name,
        t('errors.providerError', { message: err.message }),
        'system',
        { participantId: participant.id, error: true }
      )
    }

    this.emitStateChange()
  }

  /**
   * Proceed to next round
   */
  async nextRound(): Promise<Round | null> {
    if (this.status !== 'running') {
      throw new Error(t('errors.noActiveDiscussion'))
    }

    return this.runRound()
  }

  /**
   * End the discussion
   */
  async endDiscussion(): Promise<void> {
    if (this.status !== 'running' && this.status !== 'paused') {
      return
    }

    this.status = 'completed'
    this.endedAt = new Date()

    // Complete current round if active
    if (this.roundManager.hasActiveRound) {
      this.roundManager.completeCurrentRound()
    }

    this.events.emit('discussion:end', this.getState())
    this.emitStateChange()
  }

  /**
   * Pause the discussion
   */
  pause(): void {
    if (this.status === 'running') {
      this.status = 'paused'
      this.emitStateChange()
    }
  }

  /**
   * Resume the discussion
   */
  resume(): void {
    if (this.status === 'paused') {
      this.status = 'running'
      this.emitStateChange()
    }
  }

  /**
   * Reset the council
   */
  reset(): void {
    this.id = generateId()
    this.topic = ''
    this.status = 'idle'
    this.startedAt = null
    this.endedAt = null
    this.participantManager.clear()
    this.roundManager.clear()
    this.emitStateChange()
  }

  /**
   * Subscribe to events
   */
  on<K extends keyof CouncilEvents>(
    event: K,
    handler: (...args: CouncilEvents[K]) => void
  ): () => void {
    return this.events.on(event, handler)
  }

  /**
   * Set callbacks for UI updates
   */
  setCallbacks(callbacks: CouncilCallbacks): void {
    if (callbacks.onStateChange) {
      this.on('state:change', callbacks.onStateChange)
    }
    if (callbacks.onMessage) {
      this.on('message:new', callbacks.onMessage)
    }
    if (callbacks.onThinking) {
      this.on('participant:thinking', callbacks.onThinking)
    }
    if (callbacks.onResponse) {
      this.on('participant:response', callbacks.onResponse)
    }
    if (callbacks.onError) {
      this.on('participant:error', (participant, error) => {
        callbacks.onError!(error, participant)
      })
    }
    if (callbacks.onRoundComplete) {
      this.on('round:complete', callbacks.onRoundComplete)
    }
  }

  /**
   * Emit state change event
   */
  private emitStateChange(): void {
    this.events.emit('state:change', this.getState())
  }

  // Getters
  get discussionId(): string {
    return this.id
  }

  get discussionTopic(): string {
    return this.topic
  }

  get discussionStatus(): DiscussionStatus {
    return this.status
  }

  get currentRound(): number {
    return this.roundManager.currentRoundNumber
  }

  get totalRounds(): number {
    return this.roundManager.totalRounds
  }

  get participants(): Participant[] {
    return this.participantManager.getAll()
  }

  get host(): Participant | null {
    return this.participantManager.getHost()
  }

  get isRunning(): boolean {
    return this.status === 'running'
  }

  get isComplete(): boolean {
    return this.status === 'completed'
  }
}

// Singleton instance for the plugin
let councilInstance: Council | null = null

/**
 * Get or create the council instance
 */
export function getCouncil(config?: Partial<DiscussionConfig>): Council {
  if (!councilInstance) {
    councilInstance = new Council(config)
  }
  return councilInstance
}

/**
 * Reset the council instance
 */
export function resetCouncil(): void {
  councilInstance?.reset()
  councilInstance = null
}
