import { createClient } from '@/utils/supabase/server'
import type { Booking } from './queries'

export type AdminBooking = Booking & {
  user: {
    full_name: string
    email: string
    student_id: string | null
    department: {
      name: string
    } | null
  }
}

export async function getAdminBookings(
  filters?: {
    status?: 'pending' | 'approved' | 'rejected' | 'all'
    search?: string
  }
): Promise<AdminBooking[]> {
  const supabase = await createClient()
  
  let query = supabase
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
        room_code
      ),
      user:profiles (
        full_name,
        student_id,
        username, 
        department:departments (
           name
        )
      )
    `)

  // Filter by status
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  } else if (!filters?.status || filters.status === 'all') {
    // Include pending, approved, and rejected (exclude cancelled)
    query = query.in('status', ['pending', 'approved', 'rejected'])
  }

  // Search filter (by user name or room name/code)
  if (filters?.search) {
    // Note: Supabase doesn't support full-text search across relations easily
    // We'll filter in memory after fetching, or use a more complex query
    // For now, we'll fetch and filter in memory for simplicity
  }

  // Order by status (pending first), then by created_at
  query = query.order('created_at', { ascending: true })

  const { data, error } = await query

  if (error) {
    console.error('Error fetching admin bookings:', error)
    return []
  }

  let bookings = (data as unknown as AdminBooking[]) || []

  // Apply search filter in memory if needed
  if (filters?.search) {
    const searchTerm = filters.search.toLowerCase()
    bookings = bookings.filter((booking) => {
      const userName = booking.user.full_name?.toLowerCase() || ''
      const studentId = booking.user.student_id?.toLowerCase() || ''
      const roomName = booking.room.name?.toLowerCase() || ''
      const roomCode = booking.room.room_code?.toLowerCase() || ''
      
      return (
        userName.includes(searchTerm) ||
        studentId.includes(searchTerm) ||
        roomName.includes(searchTerm) ||
        roomCode.includes(searchTerm)
      )
    })
  }

  // Sort: pending first, then by created_at (oldest first for pending, newest first for others)
  bookings.sort((a, b) => {
    // Pending first
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    
    // Within same status group, sort by created_at
    const aDate = new Date(a.created_at).getTime()
    const bDate = new Date(b.created_at).getTime()
    
    if (a.status === 'pending') {
      // Oldest first for pending
      return aDate - bDate
    } else {
      // Newest first for approved/rejected
      return bDate - aDate
    }
  })

  return bookings
}

// Keep the old function for backward compatibility
export async function getPendingBookings(): Promise<AdminBooking[]> {
  return getAdminBookings({ status: 'pending' })
}

