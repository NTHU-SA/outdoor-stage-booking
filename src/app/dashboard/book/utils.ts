import { Room } from "@/utils/supabase/queries"
import { SemesterSetting, isSameDay, isDateWithin4Months, isDateInLockedPeriod, isDateInSemester } from "@/utils/semester"

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
  // Check that start and end are on the same day (no multi-day bookings)
  if (!isSameDay(startTime, endTime)) {
    return { isValid: false, message: "每次預約僅能借用單日，不能跨日連續借用" }
  }

  // 1. Check user role for 7-day rule (Client-side pre-check)
  if (!isAdmin) {
    const today = new Date()
    const minDate = new Date()
    minDate.setDate(today.getDate() + 7)
    minDate.setHours(0, 0, 0, 0)
    
    if (startTime < minDate) {
      return { isValid: false, message: "一般使用者需於 7 天前申請" }
    }
    
    // Check 4-month limit for non-admins
    if (!isDateWithin4Months(startTime)) {
      return { isValid: false, message: "一般使用者僅能借用未來 4 個月內的日期" }
    }
    
    // Check semester lock for non-admins (skip for Meeting rooms)
    const roomToBook = rooms.find(r => r.id === roomId)
    const isBookingMeetingRoom = roomToBook?.room_type === "Meeting"
    if (!isBookingMeetingRoom && isDateInLockedPeriod(startTime, semesters, false)) {
      return { isValid: false, message: "下學期課表尚未確認，暫不開放預約" }
    }

    // Check lunch break restriction (12:00 - 13:00) for non-admins
    const startMins = startTime.getHours() * 60 + startTime.getMinutes()
    const endMins = endTime.getHours() * 60 + endTime.getMinutes()
    const lunchStart = 12 * 60
    const lunchEnd = 13 * 60

    if (Math.max(startMins, lunchStart) < Math.min(endMins, lunchEnd)) {
      return { isValid: false, message: "中午 12:00 - 13:00 不開放借用" }
    }
  }

  // Rule: Unavailable periods check
  const selectedRoom = rooms.find(r => r.id === roomId)
  if (selectedRoom?.unavailable_periods && Array.isArray(selectedRoom.unavailable_periods)) {
    // Check if the booking date falls within any semester
    const isInSemester = semesters.some(semester => isDateInSemester(startTime, semester))

    if (isInSemester) {
      const bookingDay = startTime.getDay()
      const startHour = startTime.getHours()
      const startMinute = startTime.getMinutes()
      const endHour = endTime.getHours()
      const endMinute = endTime.getMinutes()
      
      const requestStartMins = startHour * 60 + startMinute
      const requestEndMins = endHour * 60 + endMinute

      for (const period of selectedRoom.unavailable_periods) {
        if (period.day === bookingDay) {
           const [pStartH, pStartM] = period.start.split(':').map(Number)
           const [pEndH, pEndM] = period.end.split(':').map(Number)
           const periodStartMins = pStartH * 60 + pStartM
           const periodEndMins = pEndH * 60 + pEndM

           if (Math.max(requestStartMins, periodStartMins) < Math.min(requestEndMins, periodEndMins)) {
             return { isValid: false, message: `此空間 ${period.start}-${period.end} 不開放借用` }
           }
        }
      }
    }
  }

  return { isValid: true }
}

export function generateTimeSlots() {
  // Generate 30-minute interval time slots from 08:00 to 22:00
  return Array.from({ length: 29 }, (_, i) => {
    const totalMinutes = 8 * 60 + i * 30 // Start from 08:00
    const hour = Math.floor(totalMinutes / 60)
    const minute = totalMinutes % 60
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  })
}

