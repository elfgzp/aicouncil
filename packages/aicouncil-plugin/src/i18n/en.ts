/**
 * English translations
 */

import type { TranslationKeys } from './types'

export const en: TranslationKeys = {
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    close: 'Close',
    retry: 'Retry',
  },

  setup: {
    title: 'Council Setup',
    selectModels: 'Select models to participate in the discussion',
    selectHost: 'Select the host model',
    noModelsSelected: 'No models selected',
    minModelsRequired: 'At least 2 models are required for a discussion',
    hostRequired: 'A host must be selected',
    ready: 'Council is ready to start',
  },

  discussion: {
    start: 'Start Discussion',
    starting: 'Starting discussion...',
    inProgress: 'Discussion in progress',
    paused: 'Discussion paused',
    completed: 'Discussion completed',
    topic: 'Topic',
    round: 'Round',
    roundOf: 'Round {current} of {total}',
    participants: 'Participants',
    host: 'Host',
    noHost: 'No host selected',
    waiting: 'Waiting for responses...',
  },

  participant: {
    thinking: 'Thinking...',
    responding: 'Responding...',
    idle: 'Idle',
    error: 'Error occurred',
    joined: '{name} joined the discussion',
    left: '{name} left the discussion',
  },

  messages: {
    userPrompt: 'User',
    systemMessage: 'System',
    summary: 'Summary',
    noMessages: 'No messages yet',
    newRound: '=== Round {round} ===',
    roundComplete: 'Round {round} completed',
  },

  commands: {
    setup: {
      name: 'council_setup',
      description: 'Set up a multi-model discussion council',
    },
    discuss: {
      name: 'council_discuss',
      description: 'Start a discussion with the configured council',
    },
    status: {
      name: 'council_status',
      description: 'Show current council status',
    },
    models: {
      name: 'council_models',
      description: 'List available models for the council',
    },
    end: {
      name: 'council_end',
      description: 'End the current discussion',
    },
    next: {
      name: 'council_next',
      description: 'Proceed to the next round',
    },
  },

  errors: {
    noActiveDiscussion: 'No active discussion. Use council_setup first.',
    discussionAlreadyRunning: 'A discussion is already in progress.',
    providerError: 'Provider error: {message}',
    timeout: 'Response timeout for {participant}',
    invalidConfig: 'Invalid configuration: {message}',
    modelNotFound: 'Model not found: {model}',
    apiError: 'API error: {message}',
    networkError: 'Network error: {message}',
  },

  prompts: {
    hostSystemPrompt: `You are the host of a multi-model AI discussion council.
Your role is to:
1. Facilitate the discussion between participants
2. Summarize key points from each round
3. Guide the conversation towards productive outcomes
4. Decide when the discussion has reached a conclusion

Current participants: {participants}
Topic: {topic}`,

    participantSystemPrompt: `You are participating in a multi-model AI discussion council.
Your role is to:
1. Provide thoughtful insights on the topic
2. Build upon or respectfully challenge other participants' ideas
3. Stay focused on the discussion topic
4. Be concise but thorough

Host: {host}
Other participants: {participants}
Topic: {topic}`,

    summaryPrompt: `Please summarize the key points from Round {round} of the discussion.
Focus on:
1. Main arguments presented
2. Points of agreement
3. Points of disagreement
4. New insights or questions raised`,

    roundStartPrompt: `=== Round {round} ===
Topic: {topic}
Previous context: {context}

Please share your thoughts on this topic.`,
  },
}
