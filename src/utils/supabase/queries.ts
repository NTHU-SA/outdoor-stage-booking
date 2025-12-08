import { createClient } from '@/utils/supabase/server'

export type Room = {
  id: string
  name: string
  room_code: string | null
  capacity: number | null
  unavailable_periods: {
    day: number
    start: string
    end: string
  }[] | null
  equipment: unknown[] | null
  floor: string | null
  room_type: string | null
  image_url: string | null
  is_active: boolean | null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getRooms(_includeInactive = false): Promise<Room[]> {
  const supabase = await createClient()
  const query = supabase
    .from('rooms')
    .select('*')
    .order('name')
  
  // Removed is_active check as the column doesn't exist in current schema
  // if (!includeInactive) {
  //   query = query.eq('is_active', true)
  // }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching rooms:', error)
    return []
  }
  
  return data as Room[]
}

export async function getRoomById(id: string): Promise<Room | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching room:', error)
    return null
  }
  
  return data as Room
}

export type Booking = {
  id: string
  room: {
    name: string
    room_code: string | null
    capacity: number | null
    floor: string | null
    room_type: string | null
  }
  start_time: string
  end_time: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'cancelled_by_user'
  purpose: string
  created_at: string
  user_name?: string // Optional, for admin view
}

export async function getUserBookings(): Promise<Booking[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      start_time,
      end_time,
      status,
      purpose,
      created_at,
      room:rooms (
        name,
        room_code,
        capacity,
        floor,
        room_type
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching bookings:', error)
    return []
  }

  return data as unknown as Booking[]
}

export type TimetableEvent = {
  id: string
  title: string
  start: Date
  end: Date
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'cancelled_by_user'
  resourceId?: string
  details?: string // For admin to see extra details
}
