/**
 * AICouncil Plugin Types
 * 
 * Core type definitions for the multi-model discussion system
 */

/**
 * Supported locale codes
 */
export type Locale = 'en' | 'zh' | 'zh-TW' | 'ja' | 'ko'

/**
 * Model provider configuration
 */
export interface ProviderConfig {
  /** Provider ID (e.g., 'anthropic', 'kimi', 'minimax') */
  id: string
  /** Display name */
  name: string
  /** Base URL for API calls */
  baseURL: string
  /** API key or token */
  apiKey: string
  /** Model ID to use */
  modelId: string
}

/**
 * Discussion participant
 */
export interface Participant {
  /** Unique participant ID */
  id: string
  /** Display name */
  name: string
  /** Provider configuration */
  provider: ProviderConfig
  /** Whether this participant is the host */
  isHost: boolean
  /** Participant status */
  status: ParticipantStatus
}

/**
 * Participant status
 */
export type ParticipantStatus = 'idle' | 'thinking' | 'responding' | 'error'

/**
 * Discussion message
 */
export interface Message {
  /** Unique message ID */
  id: string
  /** Sender participant ID */
  from: string
  /** Message content */
  content: string
  /** Round number */
  round: number
  /** Timestamp */
  timestamp: Date
  /** Message type */
  type: MessageType
  /** Optional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Message type
 */
export type MessageType = 'user' | 'assistant' | 'system' | 'summary'

/**
 * Discussion round
 */
export interface Round {
  /** Round number (1-based) */
  number: number
  /** Round status */
  status: RoundStatus
  /** Messages in this round */
  messages: Message[]
  /** Round start time */
  startedAt: Date
  /** Round end time */
  endedAt?: Date
}

/**
 * Round status
 */
export type RoundStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

/**
 * Discussion state
 */
export interface DiscussionState {
  /** Discussion ID */
  id: string
  /** Discussion topic/prompt */
  topic: string
  /** All participants */
  participants: Participant[]
  /** Host participant */
  host: Participant | null
  /** All rounds */
  rounds: Round[]
  /** Current round number */
  currentRound: number
  /** Discussion status */
  status: DiscussionStatus
  /** Discussion start time */
  startedAt: Date
  /** Discussion end time */
  endedAt?: Date
  /** Configuration */
  config: DiscussionConfig
}

/**
 * Discussion status
 */
export type DiscussionStatus = 'idle' | 'setup' | 'running' | 'paused' | 'completed' | 'error'

/**
 * Discussion configuration
 */
export interface DiscussionConfig {
  /** Maximum number of rounds */
  maxRounds: number
  /** Timeout per response (ms) */
  responseTimeout: number
  /** Whether to auto-summarize after each round */
  autoSummarize: boolean
  /** Locale for messages */
  locale: Locale
}

/**
 * Default discussion configuration
 */
export const DEFAULT_CONFIG: DiscussionConfig = {
  maxRounds: 5,
  responseTimeout: 120000, // 2 minutes
  autoSummarize: false,
  locale: 'en',
}

/**
 * Council event types
 */
export type CouncilEventType =
  | 'discussion:start'
  | 'discussion:end'
  | 'round:start'
  | 'round:end'
  | 'participant:join'
  | 'participant:leave'
  | 'participant:thinking'
  | 'participant:response'
  | 'participant:error'
  | 'message:new'
  | 'summary:generated'

/**
 * Council event
 */
export interface CouncilEvent<T = unknown> {
  type: CouncilEventType
  timestamp: Date
  data: T
}

/**
 * Event handler function
 */
export type EventHandler<T = unknown> = (event: CouncilEvent<T>) => void | Promise<void>

/**
 * Model response
 */
export interface ModelResponse {
  content: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
  finishReason?: string
}

/**
 * Council callbacks for UI updates
 */
export interface CouncilCallbacks {
  /** Called when discussion state changes */
  onStateChange?: (state: DiscussionState) => void
  /** Called when a new message is added */
  onMessage?: (message: Message) => void
  /** Called when a participant starts thinking */
  onThinking?: (participant: Participant) => void
  /** Called when a participant responds */
  onResponse?: (participant: Participant, content: string) => void
  /** Called when an error occurs */
  onError?: (error: Error, participant?: Participant) => void
  /** Called when a round completes */
  onRoundComplete?: (round: Round) => void
}
