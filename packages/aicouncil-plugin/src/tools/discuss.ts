/**
 * Council Discuss Tool
 * 
 * Tool for starting or continuing a discussion
 */

import { z } from 'zod'
import { getCouncil } from '../core/council'
import { t } from '../i18n'
import type { Message } from '../types'

/**
 * Discuss tool input schema
 */
export const discussInputSchema = z.object({
  topic: z.string().describe('The topic or question to discuss'),
  continueDiscussion: z.boolean().optional().default(false).describe('Whether to continue an existing discussion'),
})

export type DiscussInput = z.infer<typeof discussInputSchema>

/**
 * Discuss tool output
 */
export interface DiscussOutput {
  success: boolean
  message: string
  round: number
  responses: Array<{
    participant: string
    content: string
    isHost: boolean
  }>
  isComplete: boolean
}

/**
 * Execute the discuss tool
 */
export async function executeDiscuss(input: DiscussInput): Promise<DiscussOutput> {
  const council = getCouncil()

  // Check if council is set up
  if (council.participants.length < 2) {
    return {
      success: false,
      message: t('errors.noActiveDiscussion'),
      round: 0,
      responses: [],
      isComplete: false,
    }
  }

  const responses: DiscussOutput['responses'] = []

  // Set up callback to collect responses
  const unsubscribe = council.on('message:new', (message: Message) => {
    const participant = council.participants.find(p => p.name === message.from)
    if (participant && message.type === 'assistant') {
      responses.push({
        participant: message.from,
        content: message.content,
        isHost: participant.isHost,
      })
    }
  })

  try {
    if (input.continueDiscussion && council.isRunning) {
      // Continue with next round
      await council.nextRound()
    } else {
      // Start new discussion
      await council.startDiscussion(input.topic)
    }

    return {
      success: true,
      message: t('messages.roundComplete', { round: council.currentRound.toString() }),
      round: council.currentRound,
      responses,
      isComplete: council.isComplete,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
      round: council.currentRound,
      responses,
      isComplete: false,
    }
  } finally {
    unsubscribe()
  }
}

/**
 * Create the discuss tool definition for OpenCode plugin
 */
export function createDiscussTool() {
  return {
    name: 'council_discuss',
    description: t('commands.discuss.description'),
    parameters: discussInputSchema,
    execute: executeDiscuss,
  }
}
