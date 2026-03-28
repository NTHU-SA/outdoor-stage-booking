"use server"

import { createClient } from '@/utils/supabase/server'
import { TimetableEvent } from '@/utils/supabase/queries'

type BookingRow = {
  id: string
  start_time: string
  end_time: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'cancelled_by_user'
  purpose: string | null
  borrowing_unit: string | null
  profiles: {
    full_name: string | null
    username: string | null
  } | null
}

type OtherAreaBookingRow = {
  id: string
  start_time: string
  end_time: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'cancelled_by_user'
  room: {
    name: string
  } | null
}

export type OtherAreaBookingStatus = {
  id: string
  roomName: string
  start: Date
  end: Date
  status: 'pending' | 'approved'
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
      borrowing_unit,
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

    const userName = booking.profiles?.full_name || booking.profiles?.username || '未知使用者'
    const unitName = booking.borrowing_unit ? booking.borrowing_unit.trim() : '個人借用者'
    const displayUnit = unitName

    if (isAdmin) {
      title = displayUnit
      details = `借用單位: ${unitName}\n借用人: ${userName}\n狀態: ${booking.status === 'approved' ? '已核准' : '待審核'}`
    } else {
      // For regular users
      if (booking.status === 'approved') {
        title = displayUnit
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

export type AllRoomBookingEvent = TimetableEvent & {
  roomId: string
  roomName: string
  roomColor: string | null
}

export async function getAllRoomBookings(): Promise<AllRoomBookingEvent[]> {
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

  // Fetch all active rooms
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name, color')
    .eq('is_active', true)

  if (!rooms || rooms.length === 0) return []

  // Fetch all non-cancelled bookings across all rooms (future only)
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      room_id,
      start_time,
      end_time,
      status,
      purpose,
      borrowing_unit,
      profiles:user_id (
        full_name,
        username
      )
    `)
    .in('status', ['pending', 'approved'])
    .gte('end_time', new Date().toISOString())

  if (error || !data) {
    if (error) console.error('Error fetching all bookings:', error)
    return []
  }

  const roomMap = new Map(rooms.map(r => [r.id, { name: r.name, color: r.color }]))

  type AllBookingRow = BookingRow & { room_id: string }
  const bookings = data as unknown as AllBookingRow[]

  return bookings
    .filter(b => roomMap.has(b.room_id))
    .map((booking) => {
      const roomInfo = roomMap.get(booking.room_id)
      const roomName = roomInfo?.name || '未命名空間'
      const roomColor = roomInfo?.color || null
      let title = ''
      let details = ''

      const userName = booking.profiles?.full_name || booking.profiles?.username || '未知使用者'
      const unitName = booking.borrowing_unit ? booking.borrowing_unit.trim() : '個人借用者'
      const displayUnit = unitName

      if (isAdmin) {
        title = `[${roomName}] ${displayUnit}`
        details = `空間: ${roomName}\n借用單位: ${unitName}\n借用人: ${userName}\n狀態: ${booking.status === 'approved' ? '已核准' : '待審核'}`
      } else {
        if (booking.status === 'approved') {
          title = `[${roomName}] ${displayUnit}`
        } else if (booking.status === 'pending') {
          title = `[${roomName}] 審核中`
        }
      }

      return {
        id: booking.id,
        title,
        start: new Date(booking.start_time),
        end: new Date(booking.end_time),
        status: booking.status,
        details: isAdmin ? details : undefined,
        roomId: booking.room_id,
        roomName,
        roomColor,
      }
    })
}

export async function getOtherAreaBookingsDuring(
  currentRoomId: string,
  startIso: string,
  endIso: string
): Promise<OtherAreaBookingStatus[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      start_time,
      end_time,
      status,
      room:rooms (
        name
      )
    `)
    .neq('room_id', currentRoomId)
    .in('status', ['pending', 'approved'])
    .filter('start_time', 'lt', endIso)
    .filter('end_time', 'gt', startIso)
    .order('start_time', { ascending: true })

  if (error || !data) {
    if (error) {
      console.error('Error fetching other area bookings:', error)
    }
    return []
  }

  return (data as unknown as OtherAreaBookingRow[])
    .filter((row) => row.room?.name)
    .map((row) => ({
      id: row.id,
      roomName: row.room?.name || '未命名空間',
      start: new Date(row.start_time),
      end: new Date(row.end_time),
      status: row.status as 'pending' | 'approved',
    }))
}

export async function checkBookingOverlap(
  roomId: string,
  startIso: string,
  endIso: string,
  excludeBookingId?: string
): Promise<boolean> {
  const supabase = await createClient()

  let query = supabase
    .from('bookings')
    .select('id')
    .eq('room_id', roomId)
    .in('status', ['pending', 'approved'])
    .filter('start_time', 'lt', endIso)
    .filter('end_time', 'gt', startIso)

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error checking overlap:', error)
    return true // fail safe: prevent booking if error
  }

  return data.length > 0
}
