/**
 * Plugin Smoke Tests
 *
 * Quick validation tests to ensure the plugin is working correctly.
 * These tests run fast and don't require external API calls.
 */

import { describe, it, expect, vi } from 'vitest'
import AICouncilPlugin, { createAICouncilPlugin, getCouncil, resetCouncil } from '../../index'
import { providerAdapter } from '../../providers/adapter'
import { setLocale } from '../../i18n'

describe('Plugin Smoke Tests', () => {
  beforeEach(() => {
    resetCouncil()
    setLocale('en')
  })

  describe('Plugin Export', () => {
    it('should export AICouncilPlugin as default', () => {
      expect(AICouncilPlugin).toBeDefined()
      expect(typeof AICouncilPlugin).toBe('function')
    })

    it('should export createAICouncilPlugin factory', () => {
      expect(createAICouncilPlugin).toBeDefined()
      expect(typeof createAICouncilPlugin).toBe('function')
    })

    it('should create plugin with default config', () => {
      const plugin = createAICouncilPlugin()
      expect(plugin.name).toBe('@aicouncil/opencode-plugin')
      expect(plugin.version).toBe('0.1.0')
      expect(plugin.hooks).toBeDefined()
      expect(plugin.hooks?.tool).toBeDefined()
    })

    it('should create plugin with custom config', () => {
      const plugin = createAICouncilPlugin({
        locale: 'zh',
        maxRounds: 5,
        responseTimeout: 30000,
      })
      expect(plugin.hooks).toBeDefined()
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
        expect(tool.name, `Tool ${name} should have name`).toBe(name)
        expect(tool.description, `Tool ${name} should have description`).toBeDefined()
        expect(tool.parameters, `Tool ${name} should have parameters`).toBeDefined()
        expect(tool.execute, `Tool ${name} should have execute`).toBeDefined()
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
      const plugin = createAICouncilPlugin({ locale: 'en' })
      expect(plugin.hooks?.tool).toBeDefined()
    })

    it('should support Chinese locale', async () => {
      const plugin = createAICouncilPlugin({ locale: 'zh' })
      expect(plugin.hooks?.tool).toBeDefined()
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
    expect(typeof createAICouncilPlugin).toBe('function')
    expect(typeof getCouncil).toBe('function')
    expect(typeof resetCouncil).toBe('function')
    expect(typeof providerAdapter).toBe('object')
    expect(typeof setLocale).toBe('function')
  })
})
