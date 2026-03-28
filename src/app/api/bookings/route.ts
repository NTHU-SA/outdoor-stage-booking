import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  getMaxBookableMonths,
  isDateWithin4Months
} from '@/utils/semester'

const createBookingSchema = z.object({
  roomId: z.string().uuid(),
  borrowingUnit: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  purpose: z.string().min(1),
  note: z.string().max(1000).optional().nullable(),
})

const createBatchBookingSchema = z.object({
  roomId: z.string().uuid(),
  borrowingUnit: z.string().min(1),
  purpose: z.string().min(1),
  note: z.string().max(1000).optional().nullable(),
  slots: z.array(z.object({
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
  })).min(1).max(50),
})

type UnavailablePeriod = {
  day: number // 0-6, 0 is Sunday
  start: string // "HH:mm"
  end: string // "HH:mm"
}

function iterateDays(start: Date, end: Date, cb: (day: Date) => string | null): string | null {
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

function overlapWithDayMinutes(rangeStart: Date, rangeEnd: Date, day: Date, startMins: number, endMins: number): boolean {
  const dayStart = new Date(day)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(day)
  dayEnd.setHours(23, 59, 59, 999)

  const effectiveStart = new Date(Math.max(rangeStart.getTime(), dayStart.getTime()))
  const effectiveEnd = new Date(Math.min(rangeEnd.getTime(), dayEnd.getTime()))

  if (effectiveStart >= effectiveEnd) return false

  const startHour = (effectiveStart.getUTCHours() + 8) % 24
  const endHour = (effectiveEnd.getUTCHours() + 8) % 24

  const requestStart = startHour * 60 + effectiveStart.getUTCMinutes()
  const requestEnd = endHour * 60 + effectiveEnd.getUTCMinutes()

  return Math.max(requestStart, startMins) < Math.min(requestEnd, endMins)
}

type ValidationContext = {
  isAdmin: boolean
  roomId: string
  room: { unavailable_periods: UnavailablePeriod[] | null }
  maxBookableMonths: number
}

function validateSingleSlot(
  startTime: Date,
  endTime: Date,
  context: ValidationContext,
): string | null {
  const { isAdmin, room, maxBookableMonths } = context

  if (startTime >= endTime) {
    return '結束時間必須晚於開始時間'
  }

  if (!isAdmin) {
    const startHour = (startTime.getUTCHours() + 8) % 24
    const startMin = startTime.getUTCMinutes()
    const endHour = (endTime.getUTCHours() + 8) % 24
    const endMin = endTime.getUTCMinutes()

    const startMins = startHour * 60 + startMin
    const endMins = endHour * 60 + endMin

    const allowedStart = 8 * 60
    const allowedEnd = 22 * 60

    if (startMins < allowedStart || startMins >= allowedEnd) {
      return '借用時段為每日 8:00 至 22:00'
    }

    if (endMins <= allowedStart || endMins > allowedEnd) {
      return '借用時段為每日 8:00 至 22:00'
    }
  }

  if (!isAdmin) {
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationHours = durationMs / (1000 * 60 * 60)
    if (durationHours > 4) {
      return '一日最多借用 4 小時'
    }
  }

  if (!isAdmin) {
    const today = new Date()
    const minDate = new Date()
    minDate.setDate(today.getDate() + 1)
    minDate.setHours(0, 0, 0, 0)

    if (startTime < minDate) {
      return '須於借用日前 1 日提出申請'
    }

    const maxDate = new Date()
    maxDate.setDate(today.getDate() + 30)
    maxDate.setHours(23, 59, 59, 999)

    if (startTime > maxDate) {
      return '最多僅能預約未來 30 天內的日期'
    }

    if (endTime > maxDate) {
      return '借用結束日期超出可預約範圍（30 天）'
    }

    if (!isDateWithin4Months(startTime, maxBookableMonths)) {
      return `一般使用者僅能借用未來 ${maxBookableMonths} 個月內的日期`
    }

    if (!isDateWithin4Months(endTime, maxBookableMonths)) {
      return `借用結束日期超出可預約範圍（${maxBookableMonths} 個月）`
    }
  }

  const startDay = new Date(startTime)
  startDay.setHours(0, 0, 0, 0)
  const endDay = new Date(endTime)
  const effectiveEnd = new Date(endTime)
  const endHour = (effectiveEnd.getUTCHours() + 8) % 24
  if (endHour === 0 && effectiveEnd.getUTCMinutes() === 0 && effectiveEnd.getSeconds() === 0 && effectiveEnd > startTime) {
    effectiveEnd.setDate(effectiveEnd.getDate() - 1)
  }
  endDay.setTime(effectiveEnd.getTime())
  endDay.setHours(0, 0, 0, 0)

  if (startDay.getTime() !== endDay.getTime()) {
    return '無法跨天借用'
  }

  if (!isAdmin && room.unavailable_periods && Array.isArray(room.unavailable_periods)) {
    const periods = room.unavailable_periods as UnavailablePeriod[]

    const unavailableError = iterateDays(startTime, endTime, (day) => {
      const bookingDay = day.getDay()

      for (const period of periods) {
        if (period.day === bookingDay) {
          const [pStartH, pStartM] = period.start.split(':').map(Number)
          const [pEndH, pEndM] = period.end.split(':').map(Number)

          const periodStartMins = pStartH * 60 + pStartM
          const periodEndMins = pEndH * 60 + pEndM

          if (overlapWithDayMinutes(startTime, endTime, day, periodStartMins, periodEndMins)) {
            return `此時段 (${period.start}-${period.end}) 不開放借用`
          }
        }
      }

      return null
    })

    if (unavailableError) {
      return unavailableError
    }
  }

  return null
}

function hasAnyOverlap(slots: Array<{ startTime: Date; endTime: Date }>): boolean {
  const sorted = [...slots].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i - 1].endTime > sorted[i].startTime) {
      return true
    }
  }
  return false
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await request.json()
    const singleParsed = createBookingSchema.safeParse(json)
    const batchParsed = createBatchBookingSchema.safeParse(json)

    if (!singleParsed.success && !batchParsed.success) {
      return NextResponse.json({ error: '無效的資料格式' }, { status: 400 })
    }

    const isBatchRequest = batchParsed.success
    let roomId: string
    let borrowingUnit: string
    let purpose: string
    let note: string | null
    let rawSlots: Array<{ startTime: string; endTime: string }>

    if (batchParsed.success) {
      roomId = batchParsed.data.roomId
      borrowingUnit = batchParsed.data.borrowingUnit
      purpose = batchParsed.data.purpose
      note = batchParsed.data.note?.trim() || null
      rawSlots = batchParsed.data.slots
    } else {
      if (!singleParsed.success) {
        return NextResponse.json({ error: '無效的資料格式' }, { status: 400 })
      }
      roomId = singleParsed.data.roomId
      borrowingUnit = singleParsed.data.borrowingUnit
      purpose = singleParsed.data.purpose
      note = singleParsed.data.note?.trim() || null
      rawSlots = [{ startTime: singleParsed.data.startTime, endTime: singleParsed.data.endTime }]
    }

    const parsedSlots = rawSlots
      .map((slot) => ({
        startTime: new Date(slot.startTime),
        endTime: new Date(slot.endTime),
      }))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())


    // Fetch user profile for role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const isAdmin = profile?.role === 'admin'

    // Fetch room info
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('unavailable_periods, is_active')
      .eq('id', roomId)
      .maybeSingle()

    if (roomError) {
      console.error(roomError)
      return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
    }
      
    if (!room) {
      return NextResponse.json({ error: '空間不存在' }, { status: 404 })
    }

    if (room.is_active === false && !isAdmin) {
      return NextResponse.json({ error: '此空間已停用' }, { status: 400 })
    }

    const maxBookableMonths = getMaxBookableMonths()

    for (let i = 0; i < parsedSlots.length; i += 1) {
      const slot = parsedSlots[i]
      const errorMessage = validateSingleSlot(slot.startTime, slot.endTime, {
        isAdmin,
        roomId,
        room: {
          unavailable_periods: room.unavailable_periods as UnavailablePeriod[] | null,
        },
        maxBookableMonths,
      })
      if (errorMessage) {
        const prefix = parsedSlots.length > 1 ? `第 ${i + 1} 筆時段：` : ''
        return NextResponse.json({ error: `${prefix}${errorMessage}` }, { status: 400 })
      }
    }

    if (hasAnyOverlap(parsedSlots)) {
      return NextResponse.json({ error: '送出的多個時段彼此重疊，請調整後再送出' }, { status: 400 })
    }

    const minStartTime = parsedSlots[0]?.startTime
    const maxEndTime = parsedSlots[parsedSlots.length - 1]?.endTime

    const { data: overlaps, error: overlapError } = await supabase
      .from('bookings')
      .select('id, start_time, end_time')
      .eq('room_id', roomId)
      .neq('status', 'cancelled')
      .neq('status', 'rejected')
      .neq('status', 'cancelled_by_user')
      .filter('start_time', 'lt', maxEndTime.toISOString())
      .filter('end_time', 'gt', minStartTime.toISOString())
    
    if (overlapError) {
        console.error(overlapError)
        return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
    }

    if (overlaps && overlaps.length > 0) {
      const hasConflict = parsedSlots.some((slot) => {
        return overlaps.some((row) => {
          const existingStart = new Date(row.start_time)
          const existingEnd = new Date(row.end_time)
          return existingStart < slot.endTime && existingEnd > slot.startTime
        })
      })

      if (hasConflict) {
        return NextResponse.json({ error: '送出的時段中有部分已被預約' }, { status: 409 })
      }
    }

    // Create booking
    // All non-admin bookings go to pending, admin bookings are auto-approved
    const bookingStatus = isAdmin ? 'approved' : 'pending'

    const insertRows = parsedSlots.map((slot) => ({
      user_id: user.id,
      room_id: roomId,
      borrowing_unit: borrowingUnit,
      start_time: slot.startTime.toISOString(),
      end_time: slot.endTime.toISOString(),
      purpose,
      note,
      status: bookingStatus,
    }))

    const { data: bookings, error: createError } = await supabase
      .from('bookings')
      .insert(insertRows)
      .select()

    if (createError) {
        console.error(createError)
        return NextResponse.json({ error: '建立預約失敗' }, { status: 500 })
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ error: '建立預約失敗' }, { status: 500 })
    }

    if (bookings.length === 1) {
      return NextResponse.json(bookings[0])
    }

    return NextResponse.json({
      createdCount: bookings.length,
      bookings,
    })
  } catch (error) {
      if (error instanceof z.ZodError) {
          return NextResponse.json({ error: '無效的資料格式' }, { status: 400 })
      }
      console.error(error)
      return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
