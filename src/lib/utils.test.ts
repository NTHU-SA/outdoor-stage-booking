import { describe, it, expect } from 'vitest'
import { cn, toTaipeiTime, hasSocketUsage, stripSocketTag } from '@/lib/utils'

describe('cn (className merge utility)', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra')
  })

  it('should handle undefined and null', () => {
    expect(cn('base', undefined, null)).toBe('base')
  })

  it('should merge tailwind conflicting classes correctly', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('should handle empty input', () => {
    expect(cn()).toBe('')
  })

  it('should handle array input via clsx', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('should handle object input via clsx', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })
})

describe('toTaipeiTime', () => {
  it('should convert a Date to Taipei time', () => {
    // UTC midnight = 08:00 in Taipei (UTC+8)
    const utcMidnight = new Date('2024-06-15T00:00:00Z')
    const result = toTaipeiTime(utcMidnight)
    expect(result.getHours()).toBe(8)
    expect(result.getDate()).toBe(15)
  })

  it('should accept string input', () => {
    const result = toTaipeiTime('2024-06-15T00:00:00Z')
    expect(result.getHours()).toBe(8)
  })

  it('should handle date string that crosses day boundary in Taipei', () => {
    // UTC 2024-06-15 20:00 = Taipei 2024-06-16 04:00
    const result = toTaipeiTime('2024-06-15T20:00:00Z')
    expect(result.getDate()).toBe(16)
    expect(result.getHours()).toBe(4)
  })

  it('should handle Date object input', () => {
    const date = new Date('2024-01-01T12:30:00Z')
    const result = toTaipeiTime(date)
    // UTC 12:30 + 8 = 20:30 Taipei
    expect(result.getHours()).toBe(20)
    expect(result.getMinutes()).toBe(30)
  })

  it('should preserve year and month correctly', () => {
    const result = toTaipeiTime('2025-12-31T23:00:00Z')
    // UTC 23:00 Dec 31 = Taipei 07:00 Jan 1
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(0) // January
    expect(result.getDate()).toBe(1)
  })
})

describe('hasSocketUsage', () => {
  it('should return true if purpose contains socket tag', () => {
    expect(hasSocketUsage('社團活動\n(需要使用插座)')).toBe(true)
  })

  it('should return false if purpose does not contain socket tag', () => {
    expect(hasSocketUsage('社團活動')).toBe(false)
  })

  it('should return false for null', () => {
    expect(hasSocketUsage(null)).toBe(false)
  })

  it('should return false for empty string', () => {
    expect(hasSocketUsage('')).toBe(false)
  })

  it('should return false for partial match', () => {
    expect(hasSocketUsage('需要使用插座')).toBe(false)
  })
})

describe('stripSocketTag', () => {
  it('should remove socket tag from purpose', () => {
    expect(stripSocketTag('社團活動\n(需要使用插座)')).toBe('社團活動')
  })

  it('should return purpose unchanged if no socket tag', () => {
    expect(stripSocketTag('社團活動')).toBe('社團活動')
  })

  it('should return empty string for null', () => {
    expect(stripSocketTag(null)).toBe('')
  })

  it('should return empty string for empty string', () => {
    expect(stripSocketTag('')).toBe('')
  })

  it('should handle purpose with socket tag in the middle', () => {
    expect(stripSocketTag('活動\n(需要使用插座)備註')).toBe('活動備註')
  })
})
