import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  DEFAULT_MAX_BOOKABLE_MONTHS,
  normalizeMaxBookableMonths,
  getMaxBookableMonths,
  isSameDay,
  isDateWithin4Months,
  getMaxBookableDate,
  checkDateRestrictions,
} from '@/utils/semester'

describe('DEFAULT_MAX_BOOKABLE_MONTHS', () => {
  it('should be 4', () => {
    expect(DEFAULT_MAX_BOOKABLE_MONTHS).toBe(4)
  })
})

describe('normalizeMaxBookableMonths', () => {
  it('should return default for null', () => {
    expect(normalizeMaxBookableMonths(null)).toBe(DEFAULT_MAX_BOOKABLE_MONTHS)
  })

  it('should return default for undefined', () => {
    expect(normalizeMaxBookableMonths(undefined)).toBe(DEFAULT_MAX_BOOKABLE_MONTHS)
  })

  it('should return default for NaN', () => {
    expect(normalizeMaxBookableMonths(NaN)).toBe(DEFAULT_MAX_BOOKABLE_MONTHS)
  })

  it('should return the value if within valid range', () => {
    expect(normalizeMaxBookableMonths(6)).toBe(6)
  })

  it('should clamp to minimum of 1', () => {
    expect(normalizeMaxBookableMonths(0)).toBe(1)
    expect(normalizeMaxBookableMonths(-5)).toBe(1)
  })

  it('should clamp to maximum of 24', () => {
    expect(normalizeMaxBookableMonths(30)).toBe(24)
    expect(normalizeMaxBookableMonths(100)).toBe(24)
  })

  it('should truncate decimal values', () => {
    expect(normalizeMaxBookableMonths(3.7)).toBe(3)
    expect(normalizeMaxBookableMonths(5.9)).toBe(5)
  })

  it('should handle edge case: value = 1', () => {
    expect(normalizeMaxBookableMonths(1)).toBe(1)
  })

  it('should handle edge case: value = 24', () => {
    expect(normalizeMaxBookableMonths(24)).toBe(24)
  })

  it('should return default for non-number types cast as number', () => {
    expect(normalizeMaxBookableMonths('abc' as unknown as number)).toBe(DEFAULT_MAX_BOOKABLE_MONTHS)
  })
})

describe('getMaxBookableMonths', () => {
  it('should return DEFAULT_MAX_BOOKABLE_MONTHS', () => {
    expect(getMaxBookableMonths()).toBe(DEFAULT_MAX_BOOKABLE_MONTHS)
  })
})

describe('isSameDay', () => {
  it('should return true for same date different times', () => {
    const a = new Date(2024, 5, 15, 10, 30)
    const b = new Date(2024, 5, 15, 20, 0)
    expect(isSameDay(a, b)).toBe(true)
  })

  it('should return false for different dates', () => {
    const a = new Date(2024, 5, 15)
    const b = new Date(2024, 5, 16)
    expect(isSameDay(a, b)).toBe(false)
  })

  it('should return false for different months', () => {
    const a = new Date(2024, 5, 15)
    const b = new Date(2024, 6, 15)
    expect(isSameDay(a, b)).toBe(false)
  })

  it('should return false for different years', () => {
    const a = new Date(2024, 5, 15)
    const b = new Date(2025, 5, 15)
    expect(isSameDay(a, b)).toBe(false)
  })

  it('should return true for same date at midnight', () => {
    const a = new Date(2024, 0, 1, 0, 0, 0)
    const b = new Date(2024, 0, 1, 23, 59, 59)
    expect(isSameDay(a, b)).toBe(true)
  })
})

describe('isDateWithin4Months', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 15)) // June 15, 2024
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return true for today', () => {
    expect(isDateWithin4Months(new Date(2024, 5, 15))).toBe(true)
  })

  it('should return true for a date within 4 months', () => {
    expect(isDateWithin4Months(new Date(2024, 8, 1))).toBe(true)
  })

  it('should return false for a date beyond 4 months', () => {
    expect(isDateWithin4Months(new Date(2024, 11, 1))).toBe(false)
  })

  it('should respect custom maxBookableMonths', () => {
    expect(isDateWithin4Months(new Date(2024, 11, 1), 8)).toBe(true)
    expect(isDateWithin4Months(new Date(2025, 5, 1), 8)).toBe(false)
  })

  it('should return true for exact boundary date', () => {
    // 4 months from June 15 = October 15
    expect(isDateWithin4Months(new Date(2024, 9, 15))).toBe(true)
  })

  it('should return false for day after boundary', () => {
    expect(isDateWithin4Months(new Date(2024, 9, 16))).toBe(false)
  })
})

describe('getMaxBookableDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 15)) // June 15, 2024
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return a date 4 months in the future by default', () => {
    const maxDate = getMaxBookableDate()
    expect(maxDate.getMonth()).toBe(9) // October
    expect(maxDate.getDate()).toBe(15)
  })

  it('should respect custom months parameter', () => {
    const maxDate = getMaxBookableDate(2)
    expect(maxDate.getMonth()).toBe(7) // August
  })

  it('should have time set to midnight', () => {
    const maxDate = getMaxBookableDate()
    expect(maxDate.getHours()).toBe(0)
    expect(maxDate.getMinutes()).toBe(0)
    expect(maxDate.getSeconds()).toBe(0)
  })
})

describe('checkDateRestrictions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 15)) // June 15, 2024
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return not restricted for a valid date (non-admin)', () => {
    const result = checkDateRestrictions(new Date(2024, 7, 1))
    expect(result.isRestricted).toBe(false)
    expect(result.message).toBeNull()
  })

  it('should return restricted for a date beyond 4 months (non-admin)', () => {
    const result = checkDateRestrictions(new Date(2025, 0, 1))
    expect(result.isRestricted).toBe(true)
    expect(result.message).toBeTruthy()
  })

  it('should return not restricted for admin regardless of date', () => {
    const result = checkDateRestrictions(new Date(2025, 5, 1), true)
    expect(result.isRestricted).toBe(false)
    expect(result.message).toBeNull()
  })

  it('should return not restricted for today (non-admin)', () => {
    const result = checkDateRestrictions(new Date(2024, 5, 15))
    expect(result.isRestricted).toBe(false)
  })

  it('should include months in error message', () => {
    const result = checkDateRestrictions(new Date(2025, 5, 15))
    expect(result.message).toContain(`${DEFAULT_MAX_BOOKABLE_MONTHS}`)
  })
})
