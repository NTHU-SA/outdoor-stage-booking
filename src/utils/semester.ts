/**
 * Semester utility functions for booking restrictions
 */

export const DEFAULT_MAX_BOOKABLE_MONTHS = 4

export function normalizeMaxBookableMonths(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_MAX_BOOKABLE_MONTHS
  }

  return Math.min(24, Math.max(1, Math.trunc(value)))
}

export function getMaxBookableMonths(): number {
  return DEFAULT_MAX_BOOKABLE_MONTHS
}

/**
 * Check if two dates are on the same day (ignoring time)
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * Check if a date is within allowed months from today
 */
export function isDateWithin4Months(date: Date, maxBookableMonths: number = DEFAULT_MAX_BOOKABLE_MONTHS): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const maxDate = new Date(today)
  maxDate.setMonth(maxDate.getMonth() + normalizeMaxBookableMonths(maxBookableMonths))
  
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  
  return targetDate <= maxDate
}

/**
 * Get the maximum bookable date (N months from today)
 */
export function getMaxBookableDate(maxBookableMonths: number = DEFAULT_MAX_BOOKABLE_MONTHS): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const maxDate = new Date(today)
  maxDate.setMonth(maxDate.getMonth() + normalizeMaxBookableMonths(maxBookableMonths))
  
  return maxDate
}

/**
 * Check all booking restrictions for a date
 * Returns an object with the restriction status and message
 */
export function checkDateRestrictions(
  date: Date,
  isAdmin: boolean = false
): { isRestricted: boolean; message: string | null } {
  const maxBookableMonths = getMaxBookableMonths()

  // Check 4-month limit for non-admins
  if (!isAdmin && !isDateWithin4Months(date, maxBookableMonths)) {
    return {
      isRestricted: true,
      message: `一般使用者僅能借用未來 ${maxBookableMonths} 個月內的日期`
    }
  }
  
  return {
    isRestricted: false,
    message: null
  }
}

