import { describe, it, expect } from 'vitest'
import { bookingFormSchema } from '@/app/dashboard/book/schema'

describe('bookingFormSchema', () => {
  const validData = {
    roomId: 'valid-room-id',
    borrowingUnit: '學生會',
    startDate: new Date(2024, 5, 20),
    endDate: new Date(2024, 5, 20),
    startTime: '10:00',
    endTime: '12:00',
    purpose: '社團活動需要場地',
  }

  it('should accept valid data', () => {
    const result = bookingFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  // === Required field validation ===
  it('should reject missing roomId', () => {
    const { roomId, ...rest } = validData
    const result = bookingFormSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('should reject empty borrowingUnit', () => {
    const result = bookingFormSchema.safeParse({ ...validData, borrowingUnit: '' })
    expect(result.success).toBe(false)
  })

  it('should reject missing startDate', () => {
    const { startDate, ...rest } = validData
    const result = bookingFormSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('should reject missing endDate', () => {
    const { endDate, ...rest } = validData
    const result = bookingFormSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('should reject missing startTime', () => {
    const { startTime, ...rest } = validData
    const result = bookingFormSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('should reject missing endTime', () => {
    const { endTime, ...rest } = validData
    const result = bookingFormSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  // === Purpose length validation ===
  it('should reject purpose with less than 5 characters', () => {
    const result = bookingFormSchema.safeParse({ ...validData, purpose: '1234' })
    expect(result.success).toBe(false)
  })

  it('should accept purpose with exactly 5 characters', () => {
    const result = bookingFormSchema.safeParse({ ...validData, purpose: '12345' })
    expect(result.success).toBe(true)
  })

  // === Date refinement: endDate >= startDate ===
  it('should reject endDate before startDate', () => {
    const result = bookingFormSchema.safeParse({
      ...validData,
      startDate: new Date(2024, 5, 20),
      endDate: new Date(2024, 5, 19),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const endDateError = result.error.issues.find(i => i.path.includes('endDate'))
      expect(endDateError).toBeTruthy()
    }
  })

  it('should accept same startDate and endDate', () => {
    const result = bookingFormSchema.safeParse(validData) // same date
    expect(result.success).toBe(true)
  })

  it('should accept endDate after startDate', () => {
    const result = bookingFormSchema.safeParse({
      ...validData,
      startDate: new Date(2024, 5, 20),
      endDate: new Date(2024, 5, 21),
    })
    expect(result.success).toBe(true)
  })

  // === Time refinement: on same day, endTime > startTime ===
  it('should reject endTime before startTime on same day', () => {
    const result = bookingFormSchema.safeParse({
      ...validData,
      startTime: '14:00',
      endTime: '10:00',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const endTimeError = result.error.issues.find(i => i.path.includes('endTime'))
      expect(endTimeError).toBeTruthy()
    }
  })

  it('should reject same startTime and endTime on same day', () => {
    const result = bookingFormSchema.safeParse({
      ...validData,
      startTime: '10:00',
      endTime: '10:00',
    })
    expect(result.success).toBe(false)
  })

  it('should allow endTime before startTime on different days', () => {
    const result = bookingFormSchema.safeParse({
      ...validData,
      startDate: new Date(2024, 5, 20),
      endDate: new Date(2024, 5, 21),
      startTime: '20:00',
      endTime: '08:00',
    })
    expect(result.success).toBe(true)
  })
})
