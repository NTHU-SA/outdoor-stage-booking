import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  isSameDay, 
  isDateWithin4Months, 
  isDateInLockedPeriod,
  type SemesterSetting 
} from '@/utils/semester'

const updateBookingSchema = z.object({
  roomId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  purpose: z.string().min(1),
})

type UnavailablePeriod = {
  day: number
  start: string
  end: string
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if booking exists and belongs to user
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, user_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existingBooking) {
      return NextResponse.json({ error: '預約不存在' }, { status: 404 })
    }

    if (existingBooking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only allow editing pending bookings
    if (existingBooking.status !== 'pending') {
      return NextResponse.json({ error: '只能編輯待審核的預約' }, { status: 400 })
    }

    const json = await request.json()
    const body = updateBookingSchema.parse(json)

    const startTime = new Date(body.startTime)
    const endTime = new Date(body.endTime)

    if (startTime >= endTime) {
      return NextResponse.json({ error: '結束時間必須晚於開始時間' }, { status: 400 })
    }

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
      .select('unavailable_periods, room_type')
      .eq('id', body.roomId)
      .single()
      
    if (!room) {
      return NextResponse.json({ error: '空間不存在' }, { status: 404 })
    }

    const isMeetingRoom = room.room_type === "Meeting"

    // Fetch semester settings
    const { data: semesterData } = await supabase
      .from('semester_settings')
      .select('*')
      .order('start_date', { ascending: true })
    
    const semesters: SemesterSetting[] = semesterData || []

    // Check restrictions for non-admins
    if (!isAdmin) {
      const today = new Date()
      const minDate = new Date()
      minDate.setDate(today.getDate() + 7)
      minDate.setHours(0, 0, 0, 0) 
      
      if (startTime < minDate) {
        return NextResponse.json({ error: '一般使用者需於 7 天前申請' }, { status: 400 })
      }
      
      if (!isDateWithin4Months(startTime)) {
        return NextResponse.json({ error: '一般使用者僅能借用未來 4 個月內的日期' }, { status: 400 })
      }
      
      // Check semester lock (skip for Meeting rooms)
      if (!isMeetingRoom && isDateInLockedPeriod(startTime, semesters, false)) {
        return NextResponse.json({ error: '下學期課表尚未確認，暫不開放預約' }, { status: 400 })
      }
    }

    // Check unavailable periods

    if (room.unavailable_periods && Array.isArray(room.unavailable_periods)) {
      const periods = room.unavailable_periods as UnavailablePeriod[]
      const bookingDay = startTime.getDay()
      
      const bookingStartMins = startTime.getHours() * 60 + startTime.getMinutes()
      const bookingEndMins = endTime.getHours() * 60 + endTime.getMinutes()
      
      for (const period of periods) {
        if (period.day === bookingDay) {
           const [pStartH, pStartM] = period.start.split(':').map(Number)
           const [pEndH, pEndM] = period.end.split(':').map(Number)
           
           const periodStartMins = pStartH * 60 + pStartM
           const periodEndMins = pEndH * 60 + pEndM
           
           if (Math.max(bookingStartMins, periodStartMins) < Math.min(bookingEndMins, periodEndMins)) {
             return NextResponse.json({ error: `此時段 (${period.start}-${period.end}) 不開放借用` }, { status: 400 })
           }
        }
      }
    }

    // Check for overlapping bookings (excluding current booking)
    const { data: overlaps, error: overlapError } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_id', body.roomId)
      .neq('id', id)
      .neq('status', 'cancelled')
      .neq('status', 'rejected')
      .neq('status', 'cancelled_by_user')
      .filter('start_time', 'lt', body.endTime)
      .filter('end_time', 'gt', body.startTime)
    
    if (overlapError) {
        console.error(overlapError)
        return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
    }

    if (overlaps && overlaps.length > 0) {
      return NextResponse.json({ error: '該時段已被預約' }, { status: 409 })
    }

    // Update booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        room_id: body.roomId,
        start_time: body.startTime,
        end_time: body.endTime,
        purpose: body.purpose,
        status: 'pending', // Reset to pending after edit
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
        console.error(updateError)
        return NextResponse.json({ error: '更新預約失敗' }, { status: 500 })
    }

    return NextResponse.json(updatedBooking)
  } catch (error) {
      if (error instanceof z.ZodError) {
          return NextResponse.json({ error: '無效的資料格式' }, { status: 400 })
      }
      console.error(error)
      return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

