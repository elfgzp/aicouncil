/**
 * Council End Tool
 * 
 * Tool for ending the current discussion
 */

import { z } from 'zod'
import { getCouncil } from '../core/council'
import { t } from '../i18n'

/**
 * End tool input schema
 */
export const endInputSchema = z.object({
  generateSummary: z.boolean().optional().default(true).describe('Whether to generate a final summary'),
})

export type EndInput = z.infer<typeof endInputSchema>

/**
 * End tool output
 */
export interface EndOutput {
  success: boolean
  message: string
  totalRounds: number
  totalMessages: number
  summary?: string
}

/**
 * Execute the end tool
 */
export async function executeEnd(input: EndInput): Promise<EndOutput> {
  const council = getCouncil()

  if (!council.isRunning && council.discussionStatus !== 'paused') {
    return {
      success: false,
      message: t('errors.noActiveDiscussion'),
      totalRounds: 0,
      totalMessages: 0,
    }
  }

  const state = council.getState()
  const totalMessages = state.rounds.reduce((sum, r) => sum + r.messages.length, 0)

  await council.endDiscussion()

  // TODO: Generate summary if requested
  let summary: string | undefined
  if (input.generateSummary && totalMessages > 0) {
    // For now, just create a simple summary
    summary = `Discussion completed after ${state.rounds.length} rounds with ${totalMessages} messages.`
  }

  return {
    success: true,
    message: t('discussion.completed'),
    totalRounds: state.rounds.length,
    totalMessages,
    summary,
  }
}

/**
 * Create the end tool definition for OpenCode plugin
 */
export function createEndTool() {
  return {
    name: 'council_end',
    description: t('commands.end.description'),
    parameters: endInputSchema,
    execute: executeEnd,
  }
}
