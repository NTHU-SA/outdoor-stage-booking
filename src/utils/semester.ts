/**
 * Semester utility functions for booking restrictions
 */

export type SemesterSetting = {
  id: string
  semester_name: string
  start_date: string
  end_date: string
  max_bookable_months: number
  is_next_semester_open: boolean
  created_at: string
  updated_at: string
}

export const DEFAULT_MAX_BOOKABLE_MONTHS = 4

export function normalizeMaxBookableMonths(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_MAX_BOOKABLE_MONTHS
  }

  return Math.min(24, Math.max(1, Math.trunc(value)))
}

export function getMaxBookableMonths(semesters: SemesterSetting[]): number {
  const configured = semesters.find(s => typeof s.max_bookable_months === 'number')?.max_bookable_months
  return normalizeMaxBookableMonths(configured)
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
 * Determine if a date falls within a semester's date range
 */
export function isDateInSemester(date: Date, semester: SemesterSetting): boolean {
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  
  const startDate = new Date(semester.start_date)
  startDate.setHours(0, 0, 0, 0)
  
  const endDate = new Date(semester.end_date)
  endDate.setHours(23, 59, 59, 999)
  
  return targetDate >= startDate && targetDate <= endDate
}

/**
 * Get the current semester based on today's date
 * Returns null if not in any semester period
 */
export function getCurrentSemester(semesters: SemesterSetting[]): SemesterSetting | null {
  const today = new Date()
  
  for (const semester of semesters) {
    if (isDateInSemester(today, semester)) {
      return semester
    }
  }
  
  return null
}

/**
 * Get the next semester after the current one
 * If we're in 上學期, return 下學期 and vice versa
 */
export function getNextSemester(semesters: SemesterSetting[], currentSemester: SemesterSetting | null): SemesterSetting | null {
  if (!currentSemester) {
    // If no current semester, find the nearest upcoming one
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let nearestSemester: SemesterSetting | null = null
    let nearestDiff = Infinity
    
    for (const semester of semesters) {
      const startDate = new Date(semester.start_date)
      startDate.setHours(0, 0, 0, 0)
      
      if (startDate > today) {
        const diff = startDate.getTime() - today.getTime()
        if (diff < nearestDiff) {
          nearestDiff = diff
          nearestSemester = semester
        }
      }
    }
    
    return nearestSemester
  }
  
  // Find the other semester
  return semesters.find(s => s.id !== currentSemester.id) || null
}

/**
 * Check if a date is in a locked period (next semester is not open for booking)
 * Returns true if the date should be locked, false if it's bookable
 */
export function isDateInLockedPeriod(
  date: Date, 
  semesters: SemesterSetting[],
  isAdmin: boolean = false
): boolean {
  // Admins can always book
  if (isAdmin) {
    return false
  }
  
  const currentSemester = getCurrentSemester(semesters)
  const nextSemester = getNextSemester(semesters, currentSemester)
  
  // If we found a next semester, check if the date falls within it
  if (nextSemester) {
    const isInNextSemester = isDateInSemester(date, nextSemester)
    
    // If date is in next semester and next semester is not open, it's locked
    if (isInNextSemester && !nextSemester.is_next_semester_open) {
      return true
    }
  }
  
  return false
}

/**
 * Get a message explaining why a date is locked
 */
export function getLockedPeriodMessage(
  date: Date,
  semesters: SemesterSetting[]
): string | null {
  const currentSemester = getCurrentSemester(semesters)
  const nextSemester = getNextSemester(semesters, currentSemester)
  
  if (nextSemester) {
    const isInNextSemester = isDateInSemester(date, nextSemester)
    
    if (isInNextSemester && !nextSemester.is_next_semester_open) {
      return '下學期課表尚未確認，暫不開放預約'
    }
  }
  
  return null
}

/**
 * Check all booking restrictions for a date
 * Returns an object with the restriction status and message
 */
export function checkDateRestrictions(
  date: Date,
  semesters: SemesterSetting[],
  isAdmin: boolean = false
): { isRestricted: boolean; message: string | null } {
  const maxBookableMonths = getMaxBookableMonths(semesters)

  // Check 4-month limit for non-admins
  if (!isAdmin && !isDateWithin4Months(date, maxBookableMonths)) {
    return {
      isRestricted: true,
      message: `一般使用者僅能借用未來 ${maxBookableMonths} 個月內的日期`
    }
  }
  
  // Check semester lock
  if (isDateInLockedPeriod(date, semesters, isAdmin)) {
    return {
      isRestricted: true,
      message: '下學期課表尚未確認，暫不開放預約'
    }
  }
  
  return {
    isRestricted: false,
    message: null
  }
}

