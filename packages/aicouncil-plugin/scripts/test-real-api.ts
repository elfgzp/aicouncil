#!/usr/bin/env bun
/**
 * Real API Test Runner
 *
 * This script runs integration tests with real API calls.
 * It validates environment variables before running tests.
 */

import { $ } from 'bun'

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function main() {
  log('🔍 Checking environment variables...', 'blue')

  // Check API keys
  const kimiKey = process.env.KIMI_API_KEY
  const minimaxKey = process.env.MINIMAX_API_KEY

  if (!kimiKey) {
    log('❌ KIMI_API_KEY not found in environment', 'red')
    log('Please set it: export KIMI_API_KEY=your_key', 'yellow')
    process.exit(1)
  }

  if (!minimaxKey) {
    log('❌ MINIMAX_API_KEY not found in environment', 'red')
    log('Please set it: export MINIMAX_API_KEY=your_key', 'yellow')
    process.exit(1)
  }

  log(`✓ KIMI_API_KEY found (${kimiKey.substring(0, 10)}...)`, 'green')
  log(`✓ MINIMAX_API_KEY found (${minimaxKey.substring(0, 10)}...)`, 'green')

  // Run tests
  log('\n🚀 Running real API integration tests...', 'blue')
  log('Note: This will make actual API calls and consume tokens\n', 'yellow')

  try {
    const result = await $`bun test src/__tests__/integration/real-api.test.ts`
    process.exit(result.exitCode)
  } catch (error) {
    log('\n❌ Tests failed', 'red')
    process.exit(1)
  }
}

main()
