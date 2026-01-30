/**
 * Internationalization (i18n) Module
 * 
 * Provides multi-language support for the AICouncil plugin
 */

import type { Locale } from '../types'
import type { TranslationKeys, Translations } from './types'
import { en } from './en'
import { zh } from './zh'

/**
 * All available translations
 */
const translations: Translations = {
  en,
  zh,
  'zh-TW': zh, // Fallback to simplified Chinese for now
  ja: en,      // Fallback to English for now
  ko: en,      // Fallback to English for now
}

/**
 * Current locale
 */
let currentLocale: Locale = 'en'

/**
 * Set the current locale
 */
export function setLocale(locale: Locale): void {
  if (translations[locale]) {
    currentLocale = locale
  } else {
    console.warn(`Locale "${locale}" not found, falling back to "en"`)
    currentLocale = 'en'
  }
}

/**
 * Get the current locale
 */
export function getLocale(): Locale {
  return currentLocale
}

/**
 * Get available locales
 */
export function getAvailableLocales(): Locale[] {
  return Object.keys(translations) as Locale[]
}

/**
 * Get translation for a key path
 * 
 * @param keyPath - Dot-separated key path (e.g., 'common.loading')
 * @param params - Optional parameters for interpolation
 * @returns Translated string
 * 
 * @example
 * t('common.loading') // "Loading..."
 * t('participant.joined', { name: 'Claude' }) // "Claude joined the discussion"
 */
export function t(keyPath: string, params?: Record<string, string | number>): string {
  const keys = keyPath.split('.')
  let value: unknown = translations[currentLocale]

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key]
    } else {
      // Fallback to English if key not found
      value = translations.en
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as Record<string, unknown>)[k]
        } else {
          return keyPath // Return key path if not found
        }
      }
      break
    }
  }

  if (typeof value !== 'string') {
    return keyPath
  }

  // Interpolate parameters
  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, key) => {
      return params[key]?.toString() ?? `{${key}}`
    })
  }

  return value
}

/**
 * Get all translations for the current locale
 */
export function getTranslations(): TranslationKeys {
  return translations[currentLocale]
}

/**
 * Create a scoped translator for a specific namespace
 * 
 * @param namespace - The namespace to scope to
 * @returns A scoped translation function
 * 
 * @example
 * const tc = createScopedT('commands')
 * tc('setup.name') // Same as t('commands.setup.name')
 */
export function createScopedT(namespace: string) {
  return (key: string, params?: Record<string, string | number>): string => {
    return t(`${namespace}.${key}`, params)
  }
}

// Re-export types
export type { TranslationKeys, Translations } from './types'
