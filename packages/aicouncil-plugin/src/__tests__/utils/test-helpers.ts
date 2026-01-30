/**
 * Test Utilities
 *
 * Helper functions for writing tests.
 */

import { vi } from 'vitest'

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create a deferred promise that can be resolved/rejected externally
 */
export function createDeferred<T>() {
  let resolve: (value: T) => void
  let reject: (error: Error) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve: resolve!, reject: reject! }
}

/**
 * Flush all pending promises
 */
export async function flushPromises(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Create a spy that tracks call order
 */
export function createOrderSpy() {
  const calls: string[] = []

  return {
    createSpy: (name: string) => vi.fn((...args: any[]) => {
      calls.push(name)
      return args[0]
    }),
    getCalls: () => [...calls],
    clear: () => calls.length = 0,
  }
}

/**
 * Retry an assertion until it passes or times out
 */
export async function waitFor(
  assertion: () => void | Promise<void>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      await assertion()
      return
    } catch (error) {
      await wait(interval)
    }
  }

  await assertion()
}

/**
 * Match object partially (useful for large objects)
 */
export function expectToMatchPartial<T>(actual: T, expected: Partial<T>) {
  expect(actual).toMatchObject(expected)
}

/**
 * Create a sequence of values
 */
export function sequence<T>(...values: T[]): () => T {
  let index = 0
  return () => {
    const value = values[index % values.length]
    index++
    return value
  }
}
