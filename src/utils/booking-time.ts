const BOOKING_TIMEZONE_OFFSET_MS = 8 * 60 * 60 * 1000

function shiftToBookingTimezone(date: Date) {
  return new Date(date.getTime() + BOOKING_TIMEZONE_OFFSET_MS)
}

export function getBookingLocalMinutes(date: Date) {
  const shifted = shiftToBookingTimezone(date)
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes()
}

export function getBookingLocalDateKey(date: Date) {
  const shifted = shiftToBookingTimezone(date)
  const year = shifted.getUTCFullYear()
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shifted.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isBookingLocalMidnight(date: Date) {
  const shifted = shiftToBookingTimezone(date)
  return (
    shifted.getUTCHours() === 0 &&
    shifted.getUTCMinutes() === 0 &&
    shifted.getUTCSeconds() === 0 &&
    shifted.getUTCMilliseconds() === 0
  )
}

export function getEffectiveBookingEnd(endTime: Date, startTime: Date) {
  const effectiveEnd = new Date(endTime)

  if (effectiveEnd > startTime && isBookingLocalMidnight(effectiveEnd)) {
    effectiveEnd.setTime(effectiveEnd.getTime() - 1)
  }

  return effectiveEnd
}

export function isSameBookingLocalDay(startTime: Date, endTime: Date) {
  return getBookingLocalDateKey(startTime) === getBookingLocalDateKey(getEffectiveBookingEnd(endTime, startTime))
}
