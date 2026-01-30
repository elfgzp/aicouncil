import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  t,
  setLocale,
  getLocale,
  getAvailableLocales,
  getTranslations,
  createScopedT,
} from './index'
import { en } from './en'
import { zh } from './zh'

describe('setLocale', () => {
  beforeEach(() => {
    setLocale('en')
  })

  it('should set valid locale', () => {
    setLocale('zh')
    expect(getLocale()).toBe('zh')
  })

  it('should fall back to en for unsupported locale', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setLocale('unsupported' as any)
    expect(getLocale()).toBe('en')
    consoleSpy.mockRestore()
  })

  it('should warn when falling back', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setLocale('unsupported' as any)
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

describe('getLocale', () => {
  beforeEach(() => {
    setLocale('en')
  })

  it('should return current locale', () => {
    expect(getLocale()).toBe('en')
    setLocale('zh')
    expect(getLocale()).toBe('zh')
  })
})

describe('getAvailableLocales', () => {
  it('should return list of available locales', () => {
    const locales = getAvailableLocales()
    expect(locales).toContain('en')
    expect(locales).toContain('zh')
    expect(locales).toContain('zh-TW')
    expect(locales).toContain('ja')
    expect(locales).toContain('ko')
  })
})

describe('getTranslations', () => {
  beforeEach(() => {
    setLocale('en')
  })

  it('should return translations for current locale', () => {
    const translations = getTranslations()
    expect(translations).toBe(en)
  })

  it('should return zh translations when locale is zh', () => {
    setLocale('zh')
    const translations = getTranslations()
    expect(translations).toBe(zh)
  })
})

describe('t', () => {
  beforeEach(() => {
    setLocale('en')
  })

  it('should translate simple key', () => {
    const result = t('common.loading')
    expect(result).toBe('Loading...')
  })

  it('should translate nested key', () => {
    const result = t('setup.title')
    expect(result).toBe('Council Setup')
  })

  it('should interpolate parameters', () => {
    const result = t('participant.joined', { name: 'Claude' })
    expect(result).toBe('Claude joined the discussion')
  })

  it('should handle multiple parameters', () => {
    const result = t('discussion.roundOf', { current: '2', total: '5' })
    expect(result).toBe('Round 2 of 5')
  })

  it('should return key path for missing key', () => {
    const result = t('nonexistent.key')
    expect(result).toBe('nonexistent.key')
  })

  it('should fall back to English for missing key in other locale', () => {
    setLocale('zh')
    // Assuming 'common.loading' exists in both
    const result = t('common.loading')
    expect(result).toBe('加载中...')
  })

  it('should return key path if key not found in any locale', () => {
    const result = t('completely.missing.key')
    expect(result).toBe('completely.missing.key')
  })

  it('should handle empty params', () => {
    const result = t('common.loading', {})
    expect(result).toBe('Loading...')
  })

  it('should keep placeholder for missing params', () => {
    const result = t('participant.joined', {})
    expect(result).toBe('{name} joined the discussion')
  })

  it('should work with zh locale', () => {
    setLocale('zh')
    const result = t('setup.title')
    expect(result).toBe('讨论组设置')
  })

  it('should work with prompts', () => {
    const result = t('prompts.hostSystemPrompt', {
      participants: 'Alice, Bob',
      topic: 'Test Topic',
    })
    expect(result).toContain('Alice, Bob')
    expect(result).toContain('Test Topic')
  })
})

describe('createScopedT', () => {
  beforeEach(() => {
    setLocale('en')
  })

  it('should create scoped translator', () => {
    const tc = createScopedT('common')
    expect(tc('loading')).toBe('Loading...')
    expect(tc('error')).toBe('Error')
  })

  it('should work with nested scopes', () => {
    const tc = createScopedT('commands.setup')
    expect(tc('name')).toBe('council_setup')
    expect(tc('description')).toBe('Set up a multi-model discussion council')
  })

  it('should support parameters', () => {
    const tc = createScopedT('participant')
    expect(tc('joined', { name: 'Alice' })).toBe('Alice joined the discussion')
  })
})
