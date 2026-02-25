import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  isDateWithin4Months, 
  isDateInLockedPeriod,
  isDateInSemester,
  type SemesterSetting 
} from '@/utils/semester'

const createBookingSchema = z.object({
  roomId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  purpose: z.string().min(1),
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

  const requestStart = effectiveStart.getHours() * 60 + effectiveStart.getMinutes()
  const requestEnd = effectiveEnd.getHours() * 60 + effectiveEnd.getMinutes()

  return Math.max(requestStart, startMins) < Math.min(requestEnd, endMins)
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await request.json()
    const body = createBookingSchema.parse(json)

    const startTime = new Date(body.startTime)
    const endTime = new Date(body.endTime)

    if (startTime >= endTime) {
      return NextResponse.json({ error: '結束時間必須晚於開始時間' }, { status: 400 })
    }


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
      .eq('id', body.roomId)
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

    // Fetch semester settings for date restrictions
    const { data: semesterData } = await supabase
      .from('semester_settings')
      .select('*')
      .order('start_date', { ascending: true })
    
    const semesters: SemesterSetting[] = semesterData || []

    // 1. Check 3-day advance rule for non-admins
    if (!isAdmin) {
      const today = new Date()
      const minDate = new Date()
      minDate.setDate(today.getDate() + 3)
      minDate.setHours(0, 0, 0, 0) 
      
      if (startTime < minDate) {
        return NextResponse.json({ error: '一般使用者需於 3 天前申請' }, { status: 400 })
      }
      
      // 2. Check 4-month limit for non-admins
      if (!isDateWithin4Months(startTime)) {
        return NextResponse.json({ error: '一般使用者僅能借用未來 4 個月內的日期' }, { status: 400 })
      }

      if (!isDateWithin4Months(endTime)) {
        return NextResponse.json({ error: '借用結束日期超出可預約範圍（4 個月）' }, { status: 400 })
      }
      
      // 3. Check semester lock for non-admins
      const lockedError = iterateDays(startTime, endTime, (day) => {
        if (isDateInLockedPeriod(day, semesters, false)) {
          return '下學期課表尚未確認，暫不開放預約'
        }
        return null
      })
      if (lockedError) {
        return NextResponse.json({ error: lockedError }, { status: 400 })
      }

    }

    // 4. Check unavailable periods

    if (room.unavailable_periods && Array.isArray(room.unavailable_periods)) {
      const periods = room.unavailable_periods as UnavailablePeriod[]

      const unavailableError = iterateDays(startTime, endTime, (day) => {
        const isInSemester = semesters.some(semester => isDateInSemester(day, semester))
        if (!isInSemester) return null

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
        return NextResponse.json({ error: unavailableError }, { status: 400 })
      }
    }

    // 5. Check for overlapping bookings
    const { data: overlaps, error: overlapError } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_id', body.roomId)
      .neq('status', 'cancelled')
      .neq('status', 'rejected')
      .neq('status', 'cancelled_by_user') // Added check for new status
      .filter('start_time', 'lt', body.endTime)
      .filter('end_time', 'gt', body.startTime)
    
    if (overlapError) {
        console.error(overlapError)
        return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
    }

    if (overlaps && overlaps.length > 0) {
      return NextResponse.json({ error: '該時段已被預約' }, { status: 409 })
    }

    // Create booking
    // Auto-approve if duration ≤ 14 days; require manual review if > 14 days
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationDays = durationMs / (1000 * 60 * 60 * 24)
    const autoApprove = durationDays <= 14
    const bookingStatus = isAdmin ? 'approved' : (autoApprove ? 'approved' : 'pending')

    const { data: booking, error: createError } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        room_id: body.roomId,
        start_time: body.startTime,
        end_time: body.endTime,
        purpose: body.purpose,
        status: bookingStatus
      })
      .select()
      .single()

    if (createError) {
        console.error(createError)
        return NextResponse.json({ error: '建立預約失敗' }, { status: 500 })
    }

    // Create approval steps if the room has multi-level approvers (non-admin bookings only)
    if (!isAdmin && booking) {
      try {
        const supabaseAdmin = createServiceClient()
        const { data: approvers } = await supabaseAdmin
          .from('room_approvers')
          .select('user_id, step_order, label')
          .eq('room_id', body.roomId)
          .order('step_order')

        if (approvers && approvers.length > 0) {
          const steps = approvers.map(a => ({
            booking_id: booking.id,
            step_order: a.step_order,
            approver_id: a.user_id,
            label: a.label,
            status: 'pending',
          }))
          await supabaseAdmin
            .from('booking_approval_steps')
            .insert(steps)
        }
      } catch (err) {
        console.error('Error creating approval steps:', err)
        // Non-fatal: booking is still created
      }
    }

    return NextResponse.json(booking)
  } catch (error) {
      if (error instanceof z.ZodError) {
          return NextResponse.json({ error: '無效的資料格式' }, { status: 400 })
      }
      console.error(error)
      return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
