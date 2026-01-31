import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateId,
  sleep,
  timeout,
  retry,
  formatDate,
  truncate,
  deepClone,
  isObject,
  deepMerge,
  createEventEmitter,
} from './index'

describe('generateId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).not.toBe(id2)
    expect(typeof id1).toBe('string')
    expect(id1.length).toBeGreaterThan(0)
  })

  it('should contain timestamp and random part', () => {
    const id = generateId()
    const parts = id.split('-')
    expect(parts.length).toBe(2)
    expect(Number(parts[0])).toBeTypeOf('number')
    expect(parts[1]).toMatch(/^[a-z0-9]+$/)
  })
})

describe('sleep', () => {
  it('should resolve after specified duration', async () => {
    const start = Date.now()
    await sleep(50)
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(45)
    expect(elapsed).toBeLessThan(100)
  })
})

describe('timeout', () => {
  it('should resolve if promise completes in time', async () => {
    const result = await timeout(Promise.resolve('success'), 100)
    expect(result).toBe('success')
  })

  it('should reject if promise takes too long', async () => {
    const slowPromise = sleep(200).then(() => 'success')
    await expect(timeout(slowPromise, 50)).rejects.toThrow('Timeout after 50ms')
  })

  it('should use custom error message', async () => {
    const slowPromise = sleep(200).then(() => 'success')
    await expect(timeout(slowPromise, 50, 'Custom timeout')).rejects.toThrow('Custom timeout')
  })
})

describe('retry', () => {
  it('should return result on successful call', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    const result = await retry(fn, { maxRetries: 3 })
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on failure and eventually succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success')

    const result = await retry(fn, { maxRetries: 3, initialDelay: 10 })
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should throw after max retries exceeded', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))
    await expect(retry(fn, { maxRetries: 2, initialDelay: 10 })).rejects.toThrow('always fails')
    expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries
  })
})

describe('formatDate', () => {
  it('should format date as ISO string without milliseconds', () => {
    const date = new Date('2024-01-15T10:30:45.123Z')
    const formatted = formatDate(date)
    expect(formatted).toBe('2024-01-15 10:30:45')
  })
})

describe('truncate', () => {
  it('should return original string if within limit', () => {
    const str = 'short'
    expect(truncate(str, 10)).toBe('short')
  })

  it('should truncate long strings', () => {
    const str = 'this is a very long string'
    expect(truncate(str, 10)).toBe('this is...')
  })

  it('should use custom suffix', () => {
    const str = 'this is a very long string'
    expect(truncate(str, 10, ' [more]')).toBe('thi [more]')
  })
})

describe('deepClone', () => {
  it('should create a deep copy of an object', () => {
    const original = { a: 1, b: { c: 2 } }
    const clone = deepClone(original)
    expect(clone).toEqual(original)
    expect(clone).not.toBe(original)
    expect(clone.b).not.toBe(original.b)
  })

  it('should handle arrays', () => {
    const original = [1, 2, { a: 3 }]
    const clone = deepClone(original)
    expect(clone).toEqual(original)
    expect(clone).not.toBe(original)
  })
})

describe('isObject', () => {
  it('should return true for plain objects', () => {
    expect(isObject({})).toBe(true)
    expect(isObject({ a: 1 })).toBe(true)
  })

  it('should return false for non-objects', () => {
    expect(isObject(null)).toBe(false)
    expect(isObject([])).toBe(false)
    expect(isObject('string')).toBe(false)
    expect(isObject(123)).toBe(false)
    expect(isObject(undefined)).toBe(false)
  })
})

describe('deepMerge', () => {
  it('should merge objects shallowly', () => {
    const target = { a: 1, b: 2 }
    const source = { b: 3, c: 4 }
    const result = deepMerge(target, source)
    expect(result).toEqual({ a: 1, b: 3, c: 4 })
  })

  it('should merge nested objects', () => {
    const target = { a: { x: 1 } as Record<string, number>, b: 2 }
    const source = { a: { x: 1, y: 2 } }
    const result = deepMerge(target, source)
    expect(result).toEqual({ a: { x: 1, y: 2 }, b: 2 })
  })

  it('should not modify original objects', () => {
    const target = { a: 1, b: undefined as number | undefined }
    const source = { b: 2 }
    deepMerge(target, source)
    expect(target).toEqual({ a: 1, b: undefined })
  })
})

describe('createEventEmitter', () => {
  it('should emit and listen to events', () => {
    const emitter = createEventEmitter<{ test: [string, number] }>()
    const handler = vi.fn()

    emitter.on('test', handler)
    emitter.emit('test', 'hello', 42)

    expect(handler).toHaveBeenCalledWith('hello', 42)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should support multiple listeners', () => {
    const emitter = createEventEmitter<{ test: [] }>()
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    emitter.on('test', handler1)
    emitter.on('test', handler2)
    emitter.emit('test')

    expect(handler1).toHaveBeenCalled()
    expect(handler2).toHaveBeenCalled()
  })

  it('should unsubscribe from events', () => {
    const emitter = createEventEmitter<{ test: [] }>()
    const handler = vi.fn()

    const unsubscribe = emitter.on('test', handler)
    unsubscribe()
    emitter.emit('test')

    expect(handler).not.toHaveBeenCalled()
  })

  it('should remove all listeners for an event', () => {
    const emitter = createEventEmitter<{ test: [] }>()
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    emitter.on('test', handler1)
    emitter.on('test', handler2)
    emitter.off('test')
    emitter.emit('test')

    expect(handler1).not.toHaveBeenCalled()
    expect(handler2).not.toHaveBeenCalled()
  })

  it('should clear all events', () => {
    const emitter = createEventEmitter<{ test1: []; test2: [] }>()
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    emitter.on('test1', handler1)
    emitter.on('test2', handler2)
    emitter.clear()
    emitter.emit('test1')
    emitter.emit('test2')

    expect(handler1).not.toHaveBeenCalled()
    expect(handler2).not.toHaveBeenCalled()
  })

  it('should handle errors in handlers gracefully', () => {
    const emitter = createEventEmitter<{ test: [] }>()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const errorHandler = vi.fn(() => { throw new Error('handler error') })
    const goodHandler = vi.fn()

    emitter.on('test', errorHandler)
    emitter.on('test', goodHandler)
    emitter.emit('test')

    expect(consoleSpy).toHaveBeenCalled()
    expect(goodHandler).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})
