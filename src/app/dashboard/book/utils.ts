import { Room } from "@/utils/supabase/queries"
import { getMaxBookableMonths, isDateWithin4Months } from "@/utils/semester"

export type ValidationResult = {
  isValid: boolean
  message?: string
}

// Booking hours: 08:00 - 22:00
export const BOOKING_START_HOUR = 8
export const BOOKING_END_HOUR = 22

// Max booking hours per day
export const MAX_HOURS_PER_DAY = 4

// Min advance days for booking (1 day before)
export const MIN_ADVANCE_DAYS = 1

// Max advance days for booking (1 month ≈ 30 days)
export const MAX_ADVANCE_DAYS = 30

export function validateBookingRules(
  startTime: Date,
  endTime: Date,
  roomId: string,
  rooms: Room[],
  isAdmin: boolean
): ValidationResult {
  const maxBookableMonths = getMaxBookableMonths()

  const iterateDays = (start: Date, end: Date, cb: (day: Date) => ValidationResult | null): ValidationResult | null => {
    const cursor = new Date(start)
    cursor.setHours(0, 0, 0, 0)
    const last = new Date(end)
    last.setHours(0, 0, 0, 0)

    while (cursor <= last) {
      const result = cb(new Date(cursor))
      if (result) return result
      cursor.setDate(cursor.getDate() + 1)
    }

    return null
  }

  const overlapWithDayMinutes = (rangeStart: Date, rangeEnd: Date, day: Date, startMins: number, endMins: number) => {
    const dayStart = new Date(day)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(day)
    dayEnd.setHours(23, 59, 59, 999)

    const effectiveStart = new Date(Math.max(rangeStart.getTime(), dayStart.getTime()))
    const effectiveEnd = new Date(Math.min(rangeEnd.getTime(), dayEnd.getTime()))

    if (effectiveStart >= effectiveEnd) return false

    const requestStart = effectiveStart.getHours() * 60 + effectiveStart.getMinutes()
    const requestEnd = effectiveEnd.getHours() * 60 + effectiveEnd.getMinutes()

    return Math.max(requestStart, startMins) < Math.min(requestEnd, endMins)
  }

  // 1. Check booking time is within allowed hours (08:00 - 22:00)
  if (!isAdmin) {
    const startHour = startTime.getHours()
    const startMin = startTime.getMinutes()
    const endHour = endTime.getHours()
    const endMin = endTime.getMinutes()

    const startMins = startHour * 60 + startMin
    const endMins = endHour * 60 + endMin

    const allowedStart = BOOKING_START_HOUR * 60 // 480 (08:00)
    const allowedEnd = BOOKING_END_HOUR * 60 // 1320 (22:00)

    if (startMins < allowedStart || startMins >= allowedEnd) {
      return { isValid: false, message: `借用時段為每日 ${BOOKING_START_HOUR}:00 至 ${BOOKING_END_HOUR}:00` }
    }

    if (endMins <= allowedStart || endMins > allowedEnd) {
      return { isValid: false, message: `借用時段為每日 ${BOOKING_START_HOUR}:00 至 ${BOOKING_END_HOUR}:00` }
    }
  }

  // 2. Check total duration does not exceed MAX_HOURS_PER_DAY
  if (!isAdmin) {
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationHours = durationMs / (1000 * 60 * 60)
    if (durationHours > MAX_HOURS_PER_DAY) {
      return { isValid: false, message: `一日最多借用 ${MAX_HOURS_PER_DAY} 小時` }
    }
  }

  // 3. Check advance booking rule (1 day to 1 month before)
  if (!isAdmin) {
    const today = new Date()
    const minDate = new Date()
    minDate.setDate(today.getDate() + MIN_ADVANCE_DAYS)
    minDate.setHours(0, 0, 0, 0)
    
    if (startTime < minDate) {
      return { isValid: false, message: `須於借用日前 ${MIN_ADVANCE_DAYS} 日提出申請` }
    }

    const maxDate = new Date()
    maxDate.setDate(today.getDate() + MAX_ADVANCE_DAYS)
    maxDate.setHours(23, 59, 59, 999)

    if (startTime > maxDate) {
      return { isValid: false, message: `最多僅能預約未來 ${MAX_ADVANCE_DAYS} 天內的日期` }
    }

    if (endTime > maxDate) {
      return { isValid: false, message: `借用結束日期超出可預約範圍（${MAX_ADVANCE_DAYS} 天）` }
    }
    
    // Also check semester-based bookable months if configured
    if (!isDateWithin4Months(startTime, maxBookableMonths)) {
      return { isValid: false, message: `一般使用者僅能借用未來 ${maxBookableMonths} 個月內的日期` }
    }

    if (!isDateWithin4Months(endTime, maxBookableMonths)) {
      return { isValid: false, message: `借用結束日期超出可預約範圍（${maxBookableMonths} 個月）` }
    }

  }

  // Rule: Unavailable periods check
  const selectedRoom = rooms.find(r => r.id === roomId)
  if (selectedRoom?.unavailable_periods && Array.isArray(selectedRoom.unavailable_periods)) {
    const unavailableResult = iterateDays(startTime, endTime, (day) => {
      const bookingDay = day.getDay()

      for (const period of selectedRoom.unavailable_periods ?? []) {
        if (period.day === bookingDay) {
          const [pStartH, pStartM] = period.start.split(':').map(Number)
          const [pEndH, pEndM] = period.end.split(':').map(Number)
          const periodStartMins = pStartH * 60 + pStartM
          const periodEndMins = pEndH * 60 + pEndM

          if (overlapWithDayMinutes(startTime, endTime, day, periodStartMins, periodEndMins)) {
            return { isValid: false, message: `此空間 ${period.start}-${period.end} 不開放借用` }
          }
        }
      }

      return null
    })

    if (unavailableResult) return unavailableResult
  }

  return { isValid: true }
}

export function generateTimeSlots() {
  // Generate 30-minute interval time slots from 08:00 to 22:00
  const startSlot = BOOKING_START_HOUR * 2 // 16 (08:00)
  const endSlot = BOOKING_END_HOUR * 2 // 44 (22:00)
  return Array.from({ length: endSlot - startSlot + 1 }, (_, i) => {
    const totalMinutes = (startSlot + i) * 30
    const hour = Math.floor(totalMinutes / 60)
    const minute = totalMinutes % 60
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  })
}
