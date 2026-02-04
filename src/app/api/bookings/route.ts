import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  isSameDay, 
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

    // Check that booking is for a single day only (no multi-day bookings)
    if (!isSameDay(startTime, endTime)) {
      return NextResponse.json({ error: '每次預約僅能借用單日，不能跨日連續借用' }, { status: 400 })
    }

    // Fetch user profile for role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const isAdmin = profile?.role === 'admin'

    // Fetch room info first (need room_type for semester lock check)
    const { data: room } = await supabase
      .from('rooms')
      .select('unavailable_periods, room_type, is_active')
      .eq('id', body.roomId)
      .single()
      
    if (!room) {
      return NextResponse.json({ error: '空間不存在' }, { status: 404 })
    }

    if (room.is_active === false && !isAdmin) {
      return NextResponse.json({ error: '此空間已停用' }, { status: 400 })
    }

    const isMeetingRoom = room.room_type === "Meeting"

    // Fetch semester settings for date restrictions
    const { data: semesterData } = await supabase
      .from('semester_settings')
      .select('*')
      .order('start_date', { ascending: true })
    
    const semesters: SemesterSetting[] = semesterData || []

    // 1. Check 7-day rule for non-admins
    if (!isAdmin) {
      const today = new Date()
      const minDate = new Date()
      minDate.setDate(today.getDate() + 7)
      minDate.setHours(0, 0, 0, 0) 
      
      if (startTime < minDate) {
        return NextResponse.json({ error: '一般使用者需於 7 天前申請' }, { status: 400 })
      }
      
      // 2. Check 4-month limit for non-admins
      if (!isDateWithin4Months(startTime)) {
        return NextResponse.json({ error: '一般使用者僅能借用未來 4 個月內的日期' }, { status: 400 })
      }
      
      // 3. Check semester lock for non-admins (skip for Meeting rooms)
      if (!isMeetingRoom && isDateInLockedPeriod(startTime, semesters, false)) {
        return NextResponse.json({ error: '下學期課表尚未確認，暫不開放預約' }, { status: 400 })
      }

      // Check lunch break lock (12:00 - 13:00)
      const startMins = startTime.getHours() * 60 + startTime.getMinutes()
      const endMins = endTime.getHours() * 60 + endTime.getMinutes()
      const lunchStart = 12 * 60
      const lunchEnd = 13 * 60

      if (Math.max(startMins, lunchStart) < Math.min(endMins, lunchEnd)) {
        return NextResponse.json({ error: '中午 12:00 - 13:00 不開放借用' }, { status: 400 })
      }
    }

    // 4. Check unavailable periods (including lunch lock if configured)

    if (room.unavailable_periods && Array.isArray(room.unavailable_periods)) {
      // Check if the booking date falls within any semester
      const isInSemester = semesters.some(semester => isDateInSemester(startTime, semester))

      if (isInSemester) {
        const periods = room.unavailable_periods as UnavailablePeriod[]
        const bookingDay = startTime.getDay()
        
        // Normalize booking times to minutes from start of day
        const bookingStartMins = startTime.getHours() * 60 + startTime.getMinutes()
        const bookingEndMins = endTime.getHours() * 60 + endTime.getMinutes()
        
        for (const period of periods) {
          if (period.day === bookingDay) {
             const [pStartH, pStartM] = period.start.split(':').map(Number)
             const [pEndH, pEndM] = period.end.split(':').map(Number)
             
             const periodStartMins = pStartH * 60 + pStartM
             const periodEndMins = pEndH * 60 + pEndM
             
             // Check overlap: max(start1, start2) < min(end1, end2)
             if (Math.max(bookingStartMins, periodStartMins) < Math.min(bookingEndMins, periodEndMins)) {
               return NextResponse.json({ error: `此時段 (${period.start}-${period.end}) 不開放借用` }, { status: 400 })
             }
          }
        }
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
    const { data: booking, error: createError } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        room_id: body.roomId,
        start_time: body.startTime,
        end_time: body.endTime,
        purpose: body.purpose,
        status: isAdmin ? 'approved' : 'pending'
      })
      .select()
      .single()

    if (createError) {
        console.error(createError)
        return NextResponse.json({ error: '建立預約失敗' }, { status: 500 })
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
