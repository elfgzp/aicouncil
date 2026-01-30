/**
 * i18n Type Definitions
 */

import type { Locale } from '../types'

/**
 * Translation keys structure
 */
export interface TranslationKeys {
  // Common
  common: {
    loading: string
    error: string
    success: string
    cancel: string
    confirm: string
    save: string
    close: string
    retry: string
  }

  // Council setup
  setup: {
    title: string
    selectModels: string
    selectHost: string
    noModelsSelected: string
    minModelsRequired: string
    hostRequired: string
    ready: string
  }

  // Discussion
  discussion: {
    start: string
    starting: string
    inProgress: string
    paused: string
    completed: string
    topic: string
    round: string
    roundOf: string
    participants: string
    host: string
    noHost: string
    waiting: string
  }

  // Participant status
  participant: {
    thinking: string
    responding: string
    idle: string
    error: string
    joined: string
    left: string
  }

  // Messages
  messages: {
    userPrompt: string
    systemMessage: string
    summary: string
    noMessages: string
    newRound: string
    roundComplete: string
  }

  // Commands
  commands: {
    setup: {
      name: string
      description: string
    }
    discuss: {
      name: string
      description: string
    }
    status: {
      name: string
      description: string
    }
    models: {
      name: string
      description: string
    }
    end: {
      name: string
      description: string
    }
    next: {
      name: string
      description: string
    }
  }

  // Errors
  errors: {
    noActiveDiscussion: string
    discussionAlreadyRunning: string
    providerError: string
    timeout: string
    invalidConfig: string
    modelNotFound: string
    apiError: string
    networkError: string
  }

  // Prompts (for LLM)
  prompts: {
    hostSystemPrompt: string
    participantSystemPrompt: string
    summaryPrompt: string
    roundStartPrompt: string
  }
}

/**
 * Translation dictionary type
 */
export type Translations = Record<Locale, TranslationKeys>

/**
 * Get nested key type
 */
export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never
    }[keyof T]
  : never

/**
 * Translation key path
 */
export type TranslationKey = NestedKeyOf<TranslationKeys>
