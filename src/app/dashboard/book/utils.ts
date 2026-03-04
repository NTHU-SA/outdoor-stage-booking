import { Room } from "@/utils/supabase/queries"
import { SemesterSetting, getMaxBookableMonths, isDateWithin4Months, isDateInLockedPeriod, isDateInSemester } from "@/utils/semester"

export type ValidationResult = {
  isValid: boolean
  message?: string
}

export function validateBookingRules(
  startTime: Date,
  endTime: Date,
  roomId: string,
  rooms: Room[],
  semesters: SemesterSetting[],
  isAdmin: boolean
): ValidationResult {
  const maxBookableMonths = getMaxBookableMonths(semesters)

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

  // 1. Check user role for 3-day advance rule (Client-side pre-check)
  if (!isAdmin) {
    const today = new Date()
    const minDate = new Date()
    minDate.setDate(today.getDate() + 3)
    minDate.setHours(0, 0, 0, 0)
    
    if (startTime < minDate) {
      return { isValid: false, message: "一般使用者需於 3 天前申請" }
    }
    
    // Check max-month limit for non-admins
    if (!isDateWithin4Months(startTime, maxBookableMonths)) {
      return { isValid: false, message: `一般使用者僅能借用未來 ${maxBookableMonths} 個月內的日期` }
    }

    if (!isDateWithin4Months(endTime, maxBookableMonths)) {
      return { isValid: false, message: `借用結束日期超出可預約範圍（${maxBookableMonths} 個月）` }
    }
    
    // Check semester lock for non-admins (rules apply to all rooms now)
    const lockedResult = iterateDays(startTime, endTime, (day) => {
      if (isDateInLockedPeriod(day, semesters, false)) {
        return { isValid: false, message: "下學期課表尚未確認，暫不開放預約" }
      }
      return null
    })
    if (lockedResult) return lockedResult

  }

  // Rule: Unavailable periods check
  const selectedRoom = rooms.find(r => r.id === roomId)
  if (selectedRoom?.unavailable_periods && Array.isArray(selectedRoom.unavailable_periods)) {
    const unavailableResult = iterateDays(startTime, endTime, (day) => {
      // Only enforce unavailable periods in semester days
      const isInSemester = semesters.some(semester => isDateInSemester(day, semester))
      if (!isInSemester) return null

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
  // Generate 30-minute interval time slots from 00:00 to 23:30 (24 hours)
  return Array.from({ length: 48 }, (_, i) => {
    const totalMinutes = i * 30 // Start from 00:00
    const hour = Math.floor(totalMinutes / 60)
    const minute = totalMinutes % 60
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  })
}

