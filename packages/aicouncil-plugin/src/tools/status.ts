/**
 * Council Status Tool
 * 
 * Tool for checking the current council status
 */

import { z } from 'zod'
import { getCouncil } from '../core/council'
import { t } from '../i18n'

/**
 * Status tool input schema
 */
export const statusInputSchema = z.object({
  includeMessages: z.boolean().optional().default(false).describe('Whether to include message history'),
})

export type StatusInput = z.infer<typeof statusInputSchema>

/**
 * Status tool output
 */
export interface StatusOutput {
  councilId: string
  status: string
  topic: string
  currentRound: number
  maxRounds: number
  host: {
    name: string
    status: string
  } | null
  participants: Array<{
    name: string
    status: string
    isHost: boolean
  }>
  messages?: Array<{
    round: number
    from: string
    content: string
    timestamp: string
  }>
}

/**
 * Execute the status tool
 */
export async function executeStatus(input: StatusInput): Promise<StatusOutput> {
  const council = getCouncil()
  const state = council.getState()

  const output: StatusOutput = {
    councilId: state.id,
    status: state.status,
    topic: state.topic || t('discussion.noHost'),
    currentRound: state.currentRound,
    maxRounds: state.config.maxRounds,
    host: state.host ? {
      name: state.host.name,
      status: state.host.status,
    } : null,
    participants: state.participants.map(p => ({
      name: p.name,
      status: p.status,
      isHost: p.isHost,
    })),
  }

  if (input.includeMessages) {
    output.messages = state.rounds.flatMap(round =>
      round.messages.map(m => ({
        round: m.round,
        from: m.from,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      }))
    )
  }

  return output
}

/**
 * Create the status tool definition for OpenCode plugin
 */
export function createStatusTool() {
  return {
    name: 'council_status',
    description: t('commands.status.description'),
    parameters: statusInputSchema,
    execute: executeStatus,
  }
}
