"use server"

import { createClient } from '@/utils/supabase/server'
import { TimetableEvent } from '@/utils/supabase/queries'

type BookingRow = {
  id: string
  start_time: string
  end_time: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'cancelled_by_user'
  purpose: string | null
  profiles: {
    full_name: string | null
    username: string | null
  } | null
}

export async function getRoomBookings(roomId: string, excludeBookingId?: string): Promise<TimetableEvent[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  // Query bookings for the specific room
  // Filter out cancelled bookings
  let query = supabase
    .from('bookings')
    .select(`
      id,
      start_time,
      end_time,
      status,
      purpose,
      profiles:user_id (
        full_name,
        username
      )
    `)
    .eq('room_id', roomId)
    .in('status', ['pending', 'approved']) 
    .gte('end_time', new Date().toISOString())

  // Exclude a specific booking if provided (useful when editing)
  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId)
  }

  const { data, error } = await query
    
  if (error || !data) {
    if (error) {
      console.error('Error fetching room bookings:', error)
    }
    return []
  }

  const bookings = data as unknown as BookingRow[]

  return bookings.map((booking) => {
    let title = ''
    let details = ''

    if (isAdmin) {
      const userName = booking.profiles?.full_name || booking.profiles?.username || '未知使用者'
      title = `${userName} - ${booking.purpose}`
      details = `借用人: ${userName}\n事由: ${booking.purpose}\n狀態: ${booking.status === 'approved' ? '已核准' : '待審核'}`
    } else {
      // For regular users
      if (booking.status === 'approved') {
        title = '已預約'
      } else if (booking.status === 'pending') {
        title = '審核中'
      }
    }

    return {
      id: booking.id,
      title,
      start: new Date(booking.start_time),
      end: new Date(booking.end_time),
      status: booking.status,
      details: isAdmin ? details : undefined
    }
  })
}

