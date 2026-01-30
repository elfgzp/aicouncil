/**
 * Council Next Tool
 * 
 * Tool for proceeding to the next round
 */

import { z } from 'zod'
import { getCouncil } from '../core/council'
import { t } from '../i18n'
import type { Message } from '../types'

/**
 * Next tool input schema
 */
export const nextInputSchema = z.object({
  additionalContext: z.string().optional().describe('Additional context or guidance for the next round'),
})

export type NextInput = z.infer<typeof nextInputSchema>

/**
 * Next tool output
 */
export interface NextOutput {
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
 * Execute the next tool
 */
export async function executeNext(input: NextInput): Promise<NextOutput> {
  const council = getCouncil()

  if (!council.isRunning) {
    return {
      success: false,
      message: t('errors.noActiveDiscussion'),
      round: 0,
      responses: [],
      isComplete: false,
    }
  }

  const responses: NextOutput['responses'] = []

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
    const round = await council.nextRound()

    if (!round) {
      return {
        success: false,
        message: council.isComplete 
          ? t('discussion.completed')
          : t('errors.noActiveDiscussion'),
        round: council.currentRound,
        responses,
        isComplete: council.isComplete,
      }
    }

    return {
      success: true,
      message: t('messages.roundComplete', { round: round.number.toString() }),
      round: round.number,
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
 * Create the next tool definition for OpenCode plugin
 */
export function createNextTool() {
  return {
    name: 'council_next',
    description: t('commands.next.description'),
    parameters: nextInputSchema,
    execute: executeNext,
  }
}
