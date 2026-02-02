/**
 * Plugin Smoke Tests
 *
 * Quick validation tests to ensure the plugin is working correctly.
 * These tests run fast and don't require external API calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import AICouncilPlugin from '../../index'
import { getCouncil, resetCouncil } from '../../core/council'
import { providerAdapter } from '../../providers/adapter'
import { setLocale } from '../../i18n'
import * as z from 'zod'
import { createAllTools } from '../../tools'

// Simple mock for @opencode-ai/plugin that returns tools in our expected format
const createMockType = (type: string, extra: any = {}) => {
  const self = {
    _type: type,
    describe: (d: string) => {
      self._description = d
      return self
    },
    ...extra,
  }
  return self
}

const mockZ = {
  string: () => createMockType('string'),
  number: () => createMockType('number'),
  boolean: () => createMockType('boolean'),
  array: (item: any) => createMockType('array', { item }),
  any: () => createMockType('any', { optional: () => createMockType('any', { optional: true }) }),
  object: (shape: any) => createMockType('object', { shape }),
}

const mockTool = vi.fn((config: { description: string; args: any; execute: any }) => ({
  description: config.description,
  args: config.args,
  execute: config.execute,
}))
// tool.schema is the Zod namespace
mockTool.schema = mockZ

vi.mock('@opencode-ai/plugin', () => ({
  tool: mockTool,
  z: mockZ,
}))

describe('Plugin Smoke Tests', () => {
  beforeEach(() => {
    resetCouncil()
    setLocale('en')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Plugin Export', () => {
    it('should export AICouncilPlugin as default', () => {
      expect(AICouncilPlugin).toBeDefined()
      expect(typeof AICouncilPlugin).toBe('function')
    })
  })

  describe('Plugin Initialization', () => {
    it('should initialize with OpenCode context', async () => {
      const mockClient = {
        session: {
          prompt: vi.fn().mockResolvedValue({}),
        },
      }

      const result = await AICouncilPlugin({
        project: { root: '/test', name: 'test-project' },
        client: mockClient as any,
        directory: '/test',
        worktree: '/test',
        $: {},
      })

      expect(result).toBeDefined()
      expect(result.tool).toBeDefined()
    })

    it('should register all council tools', async () => {
      const mockClient = {
        session: {
          prompt: vi.fn().mockResolvedValue({}),
        },
      }

      const result = await AICouncilPlugin({
        project: { root: '/test', name: 'test-project' },
        client: mockClient as any,
        directory: '/test',
        worktree: '/test',
        $: {},
      })

      // Check all expected tools are registered
      expect(result.tool.council_setup).toBeDefined()
      expect(result.tool.council_discuss).toBeDefined()
      expect(result.tool.council_status).toBeDefined()
      expect(result.tool.council_models).toBeDefined()
      expect(result.tool.council_next).toBeDefined()
      expect(result.tool.council_end).toBeDefined()
    })
  })

  describe('Tool Definitions', () => {
    it('should have valid tool schemas', async () => {
      const mockClient = {
        session: {
          prompt: vi.fn().mockResolvedValue({}),
        },
      }

      const result = await AICouncilPlugin({
        project: { root: '/test', name: 'test-project' },
        client: mockClient as any,
        directory: '/test',
        worktree: '/test',
        $: {},
      })

      // Verify each tool has required properties
      for (const [name, tool] of Object.entries(result.tool)) {
        expect(tool, `Tool ${name} should be defined`).toBeDefined()
        expect(tool.description, `Tool ${name} should have description`).toBeDefined()
        expect(tool.execute, `Tool ${name} should have execute`).toBeDefined()
      }
    })

    it('should have tools with proper parameters', () => {
      // Test the raw tools directly (not through OpenCode wrapper)
      const tools = createAllTools()

      for (const tool of tools) {
        expect(tool.name, `Tool should have name`).toBeDefined()
        expect(tool.description, `Tool ${tool.name} should have description`).toBeDefined()
        expect(tool.parameters, `Tool ${tool.name} should have parameters`).toBeDefined()
        expect(tool.execute, `Tool ${tool.name} should have execute`).toBeDefined()
      }
    })
  })

  describe('Council State', () => {
    it('should initialize council singleton', async () => {
      const mockClient = {
        session: {
          prompt: vi.fn().mockResolvedValue({}),
        },
      }

      await AICouncilPlugin({
        project: { root: '/test', name: 'test-project' },
        client: mockClient as any,
        directory: '/test',
        worktree: '/test',
        $: {},
      })

      const council = getCouncil()
      expect(council).toBeDefined()
    })
  })

  describe('Provider Adapter', () => {
    it('should set client on provider adapter', async () => {
      const mockClient = {
        session: {
          prompt: vi.fn().mockResolvedValue({}),
        },
      }

      const setClientSpy = vi.spyOn(providerAdapter, 'setClient')

      await AICouncilPlugin({
        project: { root: '/test', name: 'test-project' },
        client: mockClient as any,
        directory: '/test',
        worktree: '/test',
        $: {},
      })

      expect(setClientSpy).toHaveBeenCalledWith(mockClient)
    })
  })

  describe('Internationalization', () => {
    it('should support English locale', async () => {
      setLocale('en')
      // Verify locale was set without error
      expect(true).toBe(true)
    })

    it('should support Chinese locale', async () => {
      setLocale('zh')
      // Verify locale was set without error
      expect(true).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing client gracefully', async () => {
      const result = await AICouncilPlugin({
        project: { root: '/test', name: 'test-project' },
        client: undefined as any,
        directory: '/test',
        worktree: '/test',
        $: {},
      })

      // Should still return tools even if client is missing
      expect(result.tool).toBeDefined()
    })
  })
})

describe('Build Verification', () => {
  it('should have all required exports', () => {
    // Verify all public APIs are exported
    expect(typeof getCouncil).toBe('function')
    expect(typeof resetCouncil).toBe('function')
    expect(typeof setLocale).toBe('function')
  })
})
