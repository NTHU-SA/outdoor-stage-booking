import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  getMaxBookableMonths,
  isDateWithin4Months
} from '@/utils/semester'

const updateBookingSchema = z.object({
  roomId: z.string().uuid(),
  borrowingUnit: z.string().min(1),
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

    const maxBookableMonths = getMaxBookableMonths()

    // Check restrictions for non-admins
    if (!isAdmin) {
      // Check booking time is within allowed hours (08:00 - 22:00)
      const startHour = startTime.getHours()
      const startMin = startTime.getMinutes()
      const endHour = endTime.getHours()
      const endMin = endTime.getMinutes()
      
      const startMins = startHour * 60 + startMin
      const endMins = endHour * 60 + endMin
      
      const allowedStart = 8 * 60 // 08:00
      const allowedEnd = 22 * 60 // 22:00
      
      if (startMins < allowedStart || startMins >= allowedEnd) {
        return NextResponse.json({ error: '借用時段為每日 8:00 至 22:00' }, { status: 400 })
      }
      
      if (endMins <= allowedStart || endMins > allowedEnd) {
        return NextResponse.json({ error: '借用時段為每日 8:00 至 22:00' }, { status: 400 })
      }

      // Check total duration does not exceed 4 hours per day
      const durationMs = endTime.getTime() - startTime.getTime()
      const durationHours = durationMs / (1000 * 60 * 60)
      if (durationHours > 4) {
        return NextResponse.json({ error: '一日最多借用 4 小時' }, { status: 400 })
      }

      // Check advance booking rule (1 day to 30 days before)
      const today = new Date()
      const minDate = new Date()
      minDate.setDate(today.getDate() + 1)
      minDate.setHours(0, 0, 0, 0) 
      
      if (startTime < minDate) {
        return NextResponse.json({ error: '須於借用日前 1 日提出申請' }, { status: 400 })
      }

      const maxDate = new Date()
      maxDate.setDate(today.getDate() + 30)
      maxDate.setHours(23, 59, 59, 999)

      if (startTime > maxDate) {
        return NextResponse.json({ error: '最多僅能預約未來 30 天內的日期' }, { status: 400 })
      }

      if (endTime > maxDate) {
        return NextResponse.json({ error: '借用結束日期超出可預約範圍（30 天）' }, { status: 400 })
      }
      
      if (!isDateWithin4Months(startTime, maxBookableMonths)) {
        return NextResponse.json({ error: `一般使用者僅能借用未來 ${maxBookableMonths} 個月內的日期` }, { status: 400 })
      }

      if (!isDateWithin4Months(endTime, maxBookableMonths)) {
        return NextResponse.json({ error: `借用結束日期超出可預約範圍（${maxBookableMonths} 個月）` }, { status: 400 })
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
        borrowing_unit: body.borrowingUnit,
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

