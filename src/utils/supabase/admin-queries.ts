import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'
import type { Booking } from './queries'

function sanitizeRscString(value: string | null | undefined) {
  if (typeof value !== 'string') return value

  // Avoid control characters and line separator chars that can break streamed RSC payload parsing.
  return value
    .replace(/[\u2028\u2029]/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
}

export type ApprovalStepInfo = {
  id: string
  step_order: number
  approver_id: string
  label: string | null
  status: 'pending' | 'approved' | 'rejected' | 'skipped'
  decided_at: string | null
  comment: string | null
  approver?: {
    full_name: string | null
  }
}

export type AdminBooking = Booking & {
  user: {
    id: string
    full_name: string
    email: string
    student_id: string | null
  }
  approval_steps?: ApprovalStepInfo[]
  has_multi_level_approval?: boolean
  current_approval_label?: string | null
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
      room_id,
      start_time,
      end_time,
      status,
      borrowing_unit,
      purpose,
      note,
      created_at,
      room:rooms (
        name,
        room_code
      ),
      user:profiles (
        id,
        full_name,
        student_id,
        username
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

  // Enrich bookings with approval steps data
  if (bookings.length > 0) {
    const bookingIds = bookings.map(b => b.id)
    const supabaseAdmin = createServiceClient()
    const { data: allSteps } = await supabaseAdmin
      .from('booking_approval_steps')
      .select(`
        id, booking_id, step_order, approver_id, label, status, decided_at, comment,
        approver:profiles!booking_approval_steps_approver_id_fkey (full_name)
      `)
      .in('booking_id', bookingIds)
      .order('step_order')

    if (allSteps && allSteps.length > 0) {
      const stepsMap = new Map<string, ApprovalStepInfo[]>()
      for (const step of allSteps) {
        const bookingId = (step as unknown as { booking_id: string }).booking_id
        if (!stepsMap.has(bookingId)) stepsMap.set(bookingId, [])
        stepsMap.get(bookingId)!.push(step as unknown as ApprovalStepInfo)
      }

      bookings = bookings.map(b => {
        const steps = stepsMap.get(b.id)
        if (steps && steps.length > 0) {
          const sanitizedSteps = steps.map((step) => ({
            ...step,
            label: sanitizeRscString(step.label) ?? null,
            comment: sanitizeRscString(step.comment) ?? null,
            approver: step.approver
              ? {
                  full_name: sanitizeRscString(step.approver.full_name) ?? null,
                }
              : undefined,
          }))

          // Find current pending step
          const currentStep = sanitizedSteps.find(s => s.status === 'pending')
          return {
            ...b,
            approval_steps: sanitizedSteps,
            has_multi_level_approval: true,
            current_approval_label: currentStep?.label || 
              (sanitizedSteps.every(s => s.status === 'approved' || s.status === 'skipped') ? '全部核准' : null),
          }
        }
        return { ...b, has_multi_level_approval: false }
      })
    }

    // Map emails to users
    const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()
    if (authUsers) {
      const emailMap = new Map(authUsers.map(u => [u.id, u.email]))
      bookings = bookings.map(b => {
        const userId = b.user.id
        return {
          ...b,
          user: {
            ...b.user,
            email: userId ? (emailMap.get(userId) || '') : ''
          }
        }
      })
    }
  }

  // Sanitize all user-editable text fields before returning data to client components.
  bookings = bookings.map((booking) => ({
    ...booking,
    borrowing_unit: sanitizeRscString(booking.borrowing_unit) ?? '',
    purpose: sanitizeRscString(booking.purpose) ?? '',
    note: sanitizeRscString(booking.note) ?? null,
    room: {
      ...booking.room,
      name: sanitizeRscString(booking.room.name) ?? '',
      room_code: sanitizeRscString(booking.room.room_code) ?? null,
    },
    user: {
      ...booking.user,
      full_name: sanitizeRscString(booking.user.full_name) ?? '',
      email: sanitizeRscString(booking.user.email) ?? '',
      student_id: sanitizeRscString(booking.user.student_id) ?? null,
    },
  }))

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

  // Sort: pending first, then by start_time descending (newest time first)
  bookings.sort((a, b) => {
    // First, sort by status: pending first
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    
    // If same status (both pending or both not pending), sort by start_time descending (newest first)
    const timeA = new Date(a.start_time).getTime()
    const timeB = new Date(b.start_time).getTime()
    return timeB - timeA  // Descending order (newest first)
  })

  return bookings
}

// Keep the old function for backward compatibility
export async function getPendingBookings(): Promise<AdminBooking[]> {
  return getAdminBookings({ status: 'pending' })
}

