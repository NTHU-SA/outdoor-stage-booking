import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateBookingRules,
  generateTimeSlots,
  BOOKING_START_HOUR,
  BOOKING_END_HOUR,
  MAX_HOURS_PER_DAY,
  MIN_ADVANCE_DAYS,
  MAX_ADVANCE_DAYS,
  expandRepeatedSlots,
  expandRepeatedSlotsForList,
  hasOverlappingSlots,
  mergeUniqueSlots,
  MAX_BATCH_SLOTS,
} from '@/app/dashboard/book/utils'
import type { Room } from '@/utils/supabase/queries'

// Helper to create a future date offset from "today" by `daysAhead` days
function futureDate(daysAhead: number, hours: number, minutes: number = 0): Date {
  // 將測試時間明確鎖定對應到 UTC+8 台灣時間的絕對時間戳
  // 例如台灣時間的 8:00，對應的是 UTC 的 0:00 (hours - 8)
  return new Date(Date.UTC(2024, 5, 15 + daysAhead, hours - 8, minutes, 0, 0))
}

const mockRoom: Room = {
  id: 'room-1',
  name: 'Test Room',
  description: null,
  unavailable_periods: null,
  image_url: null,
  is_active: true,
}

const rooms: Room[] = [mockRoom]

describe('Constants', () => {
  it('BOOKING_START_HOUR should be 8', () => {
    expect(BOOKING_START_HOUR).toBe(8)
  })

  it('BOOKING_END_HOUR should be 22', () => {
    expect(BOOKING_END_HOUR).toBe(22)
  })

  it('MAX_HOURS_PER_DAY should be 4', () => {
    expect(MAX_HOURS_PER_DAY).toBe(4)
  })

  it('MIN_ADVANCE_DAYS should be 1', () => {
    expect(MIN_ADVANCE_DAYS).toBe(1)
  })

  it('MAX_ADVANCE_DAYS should be 30', () => {
    expect(MAX_ADVANCE_DAYS).toBe(30)
  })
})

describe('validateBookingRules', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 5, 15, 10, 0)) // June 15, 2024, 10:00
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should pass for a valid booking (non-admin)', () => {
    const start = futureDate(3, 10, 0) // 3 days ahead, 10:00
    const end = futureDate(3, 12, 0)   // 3 days ahead, 12:00
    const result = validateBookingRules(start, end, 'room-1', rooms, false)
    expect(result.isValid).toBe(true)
  })

  // === Time rules ===
  it('should reject booking before 08:00 for non-admin', () => {
    const start = futureDate(3, 7, 0)
    const end = futureDate(3, 9, 0)
    const result = validateBookingRules(start, end, 'room-1', rooms, false)
    expect(result.isValid).toBe(false)
    expect(result.message).toContain('8:00')
  })

  it('should reject booking starting at 22:00 for non-admin', () => {
    const start = futureDate(3, 22, 0)
    const end = futureDate(3, 23, 0)
    const result = validateBookingRules(start, end, 'room-1', rooms, false)
    expect(result.isValid).toBe(false)
  })

  it('should reject booking ending after 22:00 for non-admin', () => {
    const start = futureDate(3, 20, 0)
    const end = futureDate(3, 23, 0)
    const result = validateBookingRules(start, end, 'room-1', rooms, false)
    expect(result.isValid).toBe(false)
  })

  it('should allow booking at boundary 08:00-22:00 for non-admin', () => {
    // Max 4 hours, so let's do 08:00-12:00
    const start = futureDate(3, 8, 0)
    const end = futureDate(3, 12, 0)
    const result = validateBookingRules(start, end, 'room-1', rooms, false)
    expect(result.isValid).toBe(true)
  })

  it('should allow admin to book outside normal hours', () => {
    const start = futureDate(3, 5, 0)
    const end = futureDate(3, 23, 0)
    const result = validateBookingRules(start, end, 'room-1', rooms, true)
    expect(result.isValid).toBe(true)
  })

  it('should allow admin to book 07:30-08:00 on the same local day', () => {
    const start = futureDate(3, 7, 30)
    const end = futureDate(3, 8, 0)
    const result = validateBookingRules(start, end, 'room-1', rooms, true)
    expect(result.isValid).toBe(true)
  })

  // === Duration rules ===
  it('should reject booking exceeding 4 hours for non-admin', () => {
    const start = futureDate(3, 8, 0)
    const end = futureDate(3, 13, 0) // 5 hours
    const result = validateBookingRules(start, end, 'room-1', rooms, false)
    expect(result.isValid).toBe(false)
    expect(result.message).toContain(`${MAX_HOURS_PER_DAY}`)
  })

  it('should allow exactly 4 hours for non-admin', () => {
    const start = futureDate(3, 10, 0)
    const end = futureDate(3, 14, 0)
    const result = validateBookingRules(start, end, 'room-1', rooms, false)
    expect(result.isValid).toBe(true)
  })

  it('should allow admin to exceed 4 hours', () => {
    const start = futureDate(3, 8, 0)
    const end = futureDate(3, 20, 0) // 12 hours
    const result = validateBookingRules(start, end, 'room-1', rooms, true)
    expect(result.isValid).toBe(true)
  })

  // === Advance booking rules ===
  it('should reject booking for today (same day) for non-admin', () => {
    const start = new Date(2024, 5, 15, 14, 0)
    const end = new Date(2024, 5, 15, 16, 0)
    const result = validateBookingRules(start, end, 'room-1', rooms, false)
    expect(result.isValid).toBe(false)
    expect(result.message).toContain(`${MIN_ADVANCE_DAYS}`)
  })

  it('should reject booking more than 30 days in advance for non-admin', () => {
    const start = futureDate(35, 10, 0)
    const end = futureDate(35, 12, 0)
    const result = validateBookingRules(start, end, 'room-1', rooms, false)
    expect(result.isValid).toBe(false)
    expect(result.message).toContain(`${MAX_ADVANCE_DAYS}`)
  })

  it('should reject when end time is beyond 30 days for non-admin', () => {
    const start = futureDate(29, 20, 0) // Within range
    const end = futureDate(31, 22, 0)   // Beyond 30 days
    const result = validateBookingRules(start, end, 'room-1', rooms, false)
    expect(result.isValid).toBe(false)
  })

  it('should allow admin to book beyond 30 days', () => {
    const start = futureDate(60, 10, 0)
    const end = futureDate(60, 14, 0)
    const result = validateBookingRules(start, end, 'room-1', rooms, true)
    expect(result.isValid).toBe(true)
  })

  // === Unavailable periods check ===
  it('should reject booking during unavailable period for non-admin', () => {
    const roomWithPeriods: Room = {
      ...mockRoom,
      unavailable_periods: [
        { day: 2, start: '09:00', end: '12:00' }, // Tuesday 09:00-12:00
      ],
    }

    // June 18, 2024 is a Tuesday
    const start = new Date(2024, 5, 18, 10, 0) // 10:00 Tuesday
    const end = new Date(2024, 5, 18, 11, 0)   // 11:00 Tuesday
    const result = validateBookingRules(start, end, roomWithPeriods.id, [roomWithPeriods], false)
    expect(result.isValid).toBe(false)
    expect(result.message).toContain('不開放借用')
  })

  it('should allow booking outside unavailable period', () => {
    const roomWithPeriods: Room = {
      ...mockRoom,
      unavailable_periods: [
        { day: 2, start: '09:00', end: '12:00' }, // Tuesday 09:00-12:00
      ],
    }

    // June 18, 2024 is a Tuesday, booking 13:00-15:00
    const start = new Date(2024, 5, 18, 13, 0)
    const end = new Date(2024, 5, 18, 15, 0)
    const result = validateBookingRules(start, end, roomWithPeriods.id, [roomWithPeriods], false)
    expect(result.isValid).toBe(true)
  })

  it('should allow admin to book during unavailable period', () => {
    const roomWithPeriods: Room = {
      ...mockRoom,
      unavailable_periods: [
        { day: 2, start: '09:00', end: '12:00' },
      ],
    }

    const start = new Date(2024, 5, 18, 10, 0)
    const end = new Date(2024, 5, 18, 11, 0)
    const result = validateBookingRules(start, end, roomWithPeriods.id, [roomWithPeriods], true)
    expect(result.isValid).toBe(true)
  })

  it('should handle room with no unavailable_periods', () => {
    const start = futureDate(3, 10, 0)
    const end = futureDate(3, 12, 0)
    const result = validateBookingRules(start, end, 'room-1', rooms, false)
    expect(result.isValid).toBe(true)
  })

  it('should handle room not found in rooms array', () => {
    const start = futureDate(3, 10, 0)
    const end = futureDate(3, 12, 0)
    const result = validateBookingRules(start, end, 'non-existent', rooms, false)
    expect(result.isValid).toBe(true) // No room found = no unavailable period check
  })

  it('should reject when end time ending at or before allowed start for non-admin', () => {
    const start = futureDate(3, 8, 0)
    const end = futureDate(3, 8, 0) // same time, but this isn't really valid either
    // Actually endMins <= allowedStart check: end at 08:00 means endMins = 480 = allowedStart
    // This should fail because endMins <= allowedStart
    // But start >= end is checked elsewhere; let's test endMins exactly at allowedStart
    const startEarly = futureDate(3, 6, 0) // before allowed
    const endEarly = futureDate(3, 8, 0)   // endMins = 480 = allowedStart, fails endMins <= allowedStart
    const result = validateBookingRules(startEarly, endEarly, 'room-1', rooms, false)
    expect(result.isValid).toBe(false)
  })

  // These tests specifically target the semester month checks (lines 118-124 in utils.ts)
  // The 30-day check uses maxDate = today + 30 days, so booking at day 25 passes the 30-day check.
  // The semester-based month check uses isDateWithin4Months, which with default 4 months
  // allows dates within ~120 days, so day+25 always passes.
  // To hit these branches, we rely on the fact that the checks ARE tested in semester.test.ts
  // and via integration: the branch is ENTERED whenever !isAdmin, but the inner condition depends on the result.

  it('should allow booking within both 30-day and 4-month limits for non-admin', () => {
    // Booking at day+15, well within both limits
    const start = futureDate(15, 10, 0)
    const end = futureDate(15, 12, 0)
    const result = validateBookingRules(start, end, 'room-1', rooms, false)
    expect(result.isValid).toBe(true)
  })

  it('should handle booking at exactly 30 days boundary', () => {
    const start = futureDate(30, 10, 0)
    const end = futureDate(30, 12, 0)
    const result = validateBookingRules(start, end, 'room-1', rooms, false)
    expect(result.isValid).toBe(true)
  })
})

describe('generateTimeSlots', () => {
  it('should generate slots from 08:00 to 22:00 for non-admin', () => {
    const slots = generateTimeSlots(false)
    expect(slots[0]).toBe('08:00')
    expect(slots[slots.length - 1]).toBe('22:00')
  })

  it('should generate 30-minute intervals', () => {
    const slots = generateTimeSlots(false)
    expect(slots[0]).toBe('08:00')
    expect(slots[1]).toBe('08:30')
    expect(slots[2]).toBe('09:00')
  })

  it('should generate correct number of slots for non-admin', () => {
    const slots = generateTimeSlots(false)
    // From 08:00 to 22:00 in 30-min intervals = (22-8)*2 + 1 = 29
    expect(slots.length).toBe(29)
  })

  it('should generate slots from 00:00 to 24:00 for admin', () => {
    const slots = generateTimeSlots(true)
    expect(slots[0]).toBe('00:00')
    expect(slots[slots.length - 1]).toBe('24:00')
  })

  it('should generate correct number of slots for admin', () => {
    const slots = generateTimeSlots(true)
    // From 00:00 to 24:00 in 30-min intervals = 48 + 1 = 49
    expect(slots.length).toBe(49)
  })

  it('should pad hours with zeros', () => {
    const slots = generateTimeSlots(true)
    expect(slots[0]).toBe('00:00')
    expect(slots[1]).toBe('00:30')
    expect(slots[2]).toBe('01:00')
  })

  it('should default to non-admin when called without argument', () => {
    const slots = generateTimeSlots()
    expect(slots[0]).toBe('08:00')
  })
})

describe('multi-slot helpers', () => {
  it('expandRepeatedSlotsForList should return empty array when base slots are empty', () => {
    const result = expandRepeatedSlotsForList([], 'weekly', new Date('2026-04-10T00:00:00.000Z'))
    expect(result).toEqual([])
  })

  it('expandRepeatedSlotsForList should return normalized slots when repeat pattern is none', () => {
    const baseSlots = [
      { start: new Date('2026-03-31T10:00:00.000Z'), end: new Date('2026-03-31T11:00:00.000Z') },
      { start: new Date('2026-03-30T10:00:00.000Z'), end: new Date('2026-03-30T11:00:00.000Z') },
      { start: new Date('2026-03-31T10:00:00.000Z'), end: new Date('2026-03-31T11:00:00.000Z') },
    ]

    const result = expandRepeatedSlotsForList(baseSlots, 'none')
    expect(result).not.toBeNull()
    expect(result?.length).toBe(2)
    expect(result?.[0].start.toISOString()).toBe('2026-03-30T10:00:00.000Z')
    expect(result?.[1].start.toISOString()).toBe('2026-03-31T10:00:00.000Z')
  })

  it('expandRepeatedSlotsForList should return null when repeatUntil is missing for repeated patterns', () => {
    const baseSlots = [
      { start: new Date('2026-03-30T10:00:00.000Z'), end: new Date('2026-03-30T11:00:00.000Z') },
    ]

    const result = expandRepeatedSlotsForList(baseSlots, 'daily')
    expect(result).toBeNull()
  })

  it('expandRepeatedSlotsForList should stop when reaching custom maxSlots', () => {
    const baseSlots = [
      { start: new Date('2026-03-30T10:00:00.000Z'), end: new Date('2026-03-30T11:00:00.000Z') },
      { start: new Date('2026-03-31T10:00:00.000Z'), end: new Date('2026-03-31T11:00:00.000Z') },
    ]

    const repeatUntil = new Date('2026-04-30T00:00:00.000Z')
    const result = expandRepeatedSlotsForList(baseSlots, 'daily', repeatUntil, 1)

    expect(result).not.toBeNull()
    expect(result?.length).toBe(1)
    expect(result?.[0].start.toISOString()).toBe('2026-03-30T10:00:00.000Z')
  })

  it('expandRepeatedSlots should return null when repeat requires end date but not provided', () => {
    const baseStart = new Date('2026-03-30T10:00:00.000Z')
    const baseEnd = new Date('2026-03-30T11:00:00.000Z')
    const result = expandRepeatedSlots(baseStart, baseEnd, 'weekly')
    expect(result).toBeNull()
  })

  it('expandRepeatedSlots should stop at MAX_BATCH_SLOTS boundary', () => {
    const baseStart = new Date('2026-03-30T10:00:00.000Z')
    const baseEnd = new Date('2026-03-30T11:00:00.000Z')
    const repeatUntil = new Date('2026-07-30T00:00:00.000Z')
    const result = expandRepeatedSlots(baseStart, baseEnd, 'daily', repeatUntil)

    expect(result).not.toBeNull()
    expect(result?.length).toBe(MAX_BATCH_SLOTS)
    expect(result?.[0].start.toISOString()).toBe('2026-03-30T10:00:00.000Z')
  })

  it('expandRepeatedSlots should include all weekly slots until repeatUntil day', () => {
    const baseStart = new Date('2026-03-30T10:00:00.000Z')
    const baseEnd = new Date('2026-03-30T11:00:00.000Z')
    const repeatUntil = new Date('2026-04-13T00:00:00.000Z')
    const result = expandRepeatedSlots(baseStart, baseEnd, 'weekly', repeatUntil)

    expect(result).not.toBeNull()
    expect(result?.length).toBe(3)
    expect(result?.[2].start.toISOString()).toBe('2026-04-13T10:00:00.000Z')
  })

  it('hasOverlappingSlots should detect overlap correctly', () => {
    const slots = [
      { start: new Date('2026-03-30T10:00:00.000Z'), end: new Date('2026-03-30T11:00:00.000Z') },
      { start: new Date('2026-03-30T10:30:00.000Z'), end: new Date('2026-03-30T11:30:00.000Z') },
    ]

    expect(hasOverlappingSlots(slots)).toBe(true)
  })

  it('mergeUniqueSlots should deduplicate and sort slots', () => {
    const slots = [
      { start: new Date('2026-03-31T10:00:00.000Z'), end: new Date('2026-03-31T11:00:00.000Z') },
      { start: new Date('2026-03-30T10:00:00.000Z'), end: new Date('2026-03-30T11:00:00.000Z') },
      { start: new Date('2026-03-31T10:00:00.000Z'), end: new Date('2026-03-31T11:00:00.000Z') },
    ]

    const result = mergeUniqueSlots(slots)
    expect(result.length).toBe(2)
    expect(result[0].start.toISOString()).toBe('2026-03-30T10:00:00.000Z')
    expect(result[1].start.toISOString()).toBe('2026-03-31T10:00:00.000Z')
  })

  it('expandRepeatedSlotsForList should repeat all selected slots weekly', () => {
    const baseSlots = [
      { start: new Date('2026-03-28T12:30:00.000Z'), end: new Date('2026-03-28T13:30:00.000Z') },
      { start: new Date('2026-03-28T19:00:00.000Z'), end: new Date('2026-03-28T20:30:00.000Z') },
      { start: new Date('2026-03-29T17:30:00.000Z'), end: new Date('2026-03-29T19:00:00.000Z') },
    ]

    const repeatUntil = new Date('2026-04-06T00:00:00.000Z')
    const result = expandRepeatedSlotsForList(baseSlots, 'weekly', repeatUntil)

    expect(result).not.toBeNull()
    expect(result?.length).toBe(6)
    expect(result?.some((slot) => slot.start.toISOString() === '2026-04-04T12:30:00.000Z')).toBe(true)
    expect(result?.some((slot) => slot.start.toISOString() === '2026-04-04T19:00:00.000Z')).toBe(true)
    expect(result?.some((slot) => slot.start.toISOString() === '2026-04-05T17:30:00.000Z')).toBe(true)
  })
})
