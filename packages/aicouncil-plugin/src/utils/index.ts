/**
 * Utility Functions
 */

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create a timeout promise that rejects after the specified duration
 */
export function timeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message ?? `Timeout after ${ms}ms`)), ms)
    ),
  ])
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffFactor?: number
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
  } = options

  let lastError: Error | undefined
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt < maxRetries) {
        await sleep(delay)
        delay = Math.min(delay * backoffFactor, maxDelay)
      }
    }
  }

  throw lastError
}

/**
 * Format a date for display
 */
export function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19)
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength - suffix.length) + suffix
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Check if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Merge objects deeply
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  const result = { ...target }

  for (const source of sources) {
    for (const key in source) {
      const sourceValue = source[key]
      const targetValue = result[key]

      if (isObject(sourceValue) && isObject(targetValue)) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>]
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as T[Extract<keyof T, string>]
      }
    }
  }

  return result
}

/**
 * Create an event emitter
 */
export function createEventEmitter<T extends Record<string, unknown[]>>() {
  const listeners = new Map<keyof T, Set<(...args: unknown[]) => void>>()

  return {
    on<K extends keyof T>(event: K, handler: (...args: T[K]) => void): () => void {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)!.add(handler as (...args: unknown[]) => void)
      
      // Return unsubscribe function
      return () => {
        listeners.get(event)?.delete(handler as (...args: unknown[]) => void)
      }
    },

    emit<K extends keyof T>(event: K, ...args: T[K]): void {
      listeners.get(event)?.forEach(handler => {
        try {
          handler(...args)
        } catch (error) {
          console.error(`Error in event handler for "${String(event)}":`, error)
        }
      })
    },

    off<K extends keyof T>(event: K, handler?: (...args: T[K]) => void): void {
      if (handler) {
        listeners.get(event)?.delete(handler as (...args: unknown[]) => void)
      } else {
        listeners.delete(event)
      }
    },

    clear(): void {
      listeners.clear()
    },
  }
}
