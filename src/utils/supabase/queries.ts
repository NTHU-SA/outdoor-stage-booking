import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'

export type Room = {
  id: string
  name: string
  description: string | null
  unavailable_periods: {
    day: number
    start: string
    end: string
  }[] | null
  image_url: string | null
  is_active: boolean | null
  color: string | null
}

let publicSupabase: ReturnType<typeof createSupabaseClient> | null = null

function getPublicSupabase() {
  if (!publicSupabase) {
    publicSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }

  return publicSupabase
}

const roomSelect = 'id, name, description, unavailable_periods, image_url, is_active, color'

const getCachedActiveRooms = unstable_cache(
  async () => {
    const { data, error } = await getPublicSupabase()
      .from('rooms')
      .select(roomSelect)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching rooms:', error)
      return []
    }

    return data as Room[]
  },
  ['active-rooms'],
  {
    revalidate: 300,
    tags: ['rooms'],
  }
)

const getCachedRoomById = unstable_cache(
  async (id: string) => {
    const { data, error } = await getPublicSupabase()
      .from('rooms')
      .select(roomSelect)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching room:', error)
      return null
    }

    return data as Room
  },
  ['room-by-id'],
  {
    revalidate: 300,
    tags: ['rooms'],
  }
)

 
export async function getRooms(includeInactive = false): Promise<Room[]> {
  if (!includeInactive) {
    return getCachedActiveRooms()
  }

  const supabase = await createClient()
  const query = supabase
    .from('rooms')
    .select(roomSelect)
    .order('name')
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching rooms:', error)
    return []
  }
  
  return data as Room[]
}

export async function getRoomById(id: string): Promise<Room | null> {
  return getCachedRoomById(id)
}

export type Booking = {
  id: string
  room_id?: string
  room: {
    id?: string
    name: string
    room_code?: string | null
  }
  start_time: string
  end_time: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'cancelled_by_user'
  borrowing_unit?: string | null
  purpose: string
  note?: string | null
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
      room_id,
      start_time,
      end_time,
      status,
      borrowing_unit,
      purpose,
      created_at,
      room:rooms (
        id,
        name
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
