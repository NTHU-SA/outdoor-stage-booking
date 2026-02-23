"use server"

import { createClient } from "@/utils/supabase/server"
import { createServiceClient } from "@/utils/supabase/service"
import { revalidatePath } from "next/cache"

// Ensure current user is admin
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profile?.role !== 'admin') throw new Error("Forbidden")
  return { supabase, user }
}

// Get current user (for approver actions)
async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  return { supabase, user }
}

export type RoomApprover = {
  id: string
  room_id: string
  user_id: string
  step_order: number
  label: string | null
  user?: {
    full_name: string | null
    email?: string
  }
}

export type ApprovalStep = {
  id: string
  booking_id: string
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

// ===== Room Approvers CRUD =====

export async function getRoomApprovers(roomId: string): Promise<RoomApprover[]> {
  const { supabase } = await requireAdmin()

  const { data, error } = await supabase
    .from('room_approvers')
    .select(`
      id, room_id, user_id, step_order, label,
      user:profiles (full_name)
    `)
    .eq('room_id', roomId)
    .order('step_order')

  if (error) {
    console.error('Error fetching room approvers:', error)
    return []
  }
  return data as unknown as RoomApprover[]
}

export async function setRoomApprovers(
  roomId: string,
  approvers: { user_id: string; step_order: number; label: string }[]
) {
  await requireAdmin()
  const supabaseAdmin = createServiceClient()

  // Delete all existing approvers for this room
  const { error: deleteError } = await supabaseAdmin
    .from('room_approvers')
    .delete()
    .eq('room_id', roomId)

  if (deleteError) throw new Error(deleteError.message)

  // Insert new approvers
  if (approvers.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from('room_approvers')
      .insert(
        approvers.map(a => ({
          room_id: roomId,
          user_id: a.user_id,
          step_order: a.step_order,
          label: a.label,
        }))
      )

    if (insertError) throw new Error(insertError.message)
  }

  revalidatePath('/dashboard/admin/rooms')
}

// ===== Approval Steps for Bookings =====

// Create approval steps for a booking (called when a booking is created)
export async function createApprovalStepsForBooking(bookingId: string, roomId: string) {
  const supabaseAdmin = createServiceClient()

  // Get the room's approvers
  const { data: approvers, error: fetchError } = await supabaseAdmin
    .from('room_approvers')
    .select('user_id, step_order, label')
    .eq('room_id', roomId)
    .order('step_order')

  if (fetchError) {
    console.error('Error fetching room approvers:', fetchError)
    return
  }

  // If no approvers, no steps needed
  if (!approvers || approvers.length === 0) return

  // Create one step per approver
  const steps = approvers.map(a => ({
    booking_id: bookingId,
    step_order: a.step_order,
    approver_id: a.user_id,
    label: a.label,
    status: 'pending',
  }))

  const { error: insertError } = await supabaseAdmin
    .from('booking_approval_steps')
    .insert(steps)

  if (insertError) {
    console.error('Error creating approval steps:', insertError)
  }
}

// Get approval steps for a booking
export async function getApprovalSteps(bookingId: string): Promise<ApprovalStep[]> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('booking_approval_steps')
    .select(`
      id, booking_id, step_order, approver_id, label, status, decided_at, comment,
      approver:profiles!booking_approval_steps_approver_id_fkey (full_name)
    `)
    .eq('booking_id', bookingId)
    .order('step_order')

  if (error) {
    console.error('Error fetching approval steps:', error)
    return []
  }
  return data as unknown as ApprovalStep[]
}

// Approver approves their step
export async function approveStep(bookingId: string, stepId: string) {
  const { supabase, user } = await requireAuth()

  // Verify this step belongs to the current user
  const { data: step, error: stepError } = await supabase
    .from('booking_approval_steps')
    .select('id, booking_id, step_order, approver_id, status')
    .eq('id', stepId)
    .eq('booking_id', bookingId)
    .single()

  if (stepError || !step) throw new Error("找不到此審核步驟")
  if (step.approver_id !== user.id) throw new Error("您無權審核此步驟")
  if (step.status !== 'pending') throw new Error("此步驟已處理")

  // Check that all previous steps are approved
  const { data: prevSteps } = await supabase
    .from('booking_approval_steps')
    .select('step_order, status')
    .eq('booking_id', bookingId)
    .lt('step_order', step.step_order)

  const allPrevApproved = !prevSteps || prevSteps.every(s => s.status === 'approved' || s.status === 'skipped')
  if (!allPrevApproved) throw new Error("前一位審核人尚未完成審核")

  // Update this step to approved
  const supabaseAdmin = createServiceClient()
  const { error: updateError } = await supabaseAdmin
    .from('booking_approval_steps')
    .update({
      status: 'approved',
      decided_at: new Date().toISOString(),
    })
    .eq('id', stepId)

  if (updateError) throw new Error(updateError.message)

  // Check if this was the last step
  const { data: allSteps } = await supabaseAdmin
    .from('booking_approval_steps')
    .select('status')
    .eq('booking_id', bookingId)

  const allApproved = allSteps?.every(s => s.status === 'approved' || s.status === 'skipped')

  if (allApproved) {
    // All steps approved → check for conflicts and approve the booking
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('room_id, start_time, end_time')
      .eq('id', bookingId)
      .single()

    if (booking) {
      const { data: overlaps } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('room_id', booking.room_id)
        .eq('status', 'approved')
        .filter('start_time', 'lt', booking.end_time)
        .filter('end_time', 'gt', booking.start_time)

      if (overlaps && overlaps.length > 0) {
        throw new Error('該時段已有核准的預約，無法核准此申請')
      }
    }

    await supabaseAdmin
      .from('bookings')
      .update({ status: 'approved' })
      .eq('id', bookingId)
  }

  revalidatePath('/dashboard/admin/approvals')
  revalidatePath('/dashboard/admin/approver-review')
}

// Approver rejects their step → entire booking gets rejected
export async function rejectStep(bookingId: string, stepId: string, reason?: string) {
  const { supabase, user } = await requireAuth()

  // Verify this step belongs to the current user
  const { data: step, error: stepError } = await supabase
    .from('booking_approval_steps')
    .select('id, booking_id, step_order, approver_id, status')
    .eq('id', stepId)
    .eq('booking_id', bookingId)
    .single()

  if (stepError || !step) throw new Error("找不到此審核步驟")
  if (step.approver_id !== user.id) throw new Error("您無權審核此步驟")
  if (step.status !== 'pending') throw new Error("此步驟已處理")

  const supabaseAdmin = createServiceClient()

  // Update step to rejected
  const { error: updateError } = await supabaseAdmin
    .from('booking_approval_steps')
    .update({
      status: 'rejected',
      decided_at: new Date().toISOString(),
      comment: reason || null,
    })
    .eq('id', stepId)

  if (updateError) throw new Error(updateError.message)

  // Reject the entire booking
  await supabaseAdmin
    .from('bookings')
    .update({
      status: 'rejected',
      rejection_reason: reason || null,
    })
    .eq('id', bookingId)

  revalidatePath('/dashboard/admin/approvals')
  revalidatePath('/dashboard/admin/approver-review')
}

// Admin force-approve: skip all pending steps and directly approve
export async function adminForceApprove(bookingId: string) {
  await requireAdmin()
  const supabaseAdmin = createServiceClient()

  // Skip all pending approval steps
  const { error: skipError } = await supabaseAdmin
    .from('booking_approval_steps')
    .update({
      status: 'skipped',
      decided_at: new Date().toISOString(),
      comment: '管理員直接核准',
    })
    .eq('booking_id', bookingId)
    .eq('status', 'pending')

  if (skipError) throw new Error(skipError.message)

  // Check for time conflicts
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('room_id, start_time, end_time')
    .eq('id', bookingId)
    .single()

  if (booking) {
    const { data: overlaps } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('room_id', booking.room_id)
      .eq('status', 'approved')
      .filter('start_time', 'lt', booking.end_time)
      .filter('end_time', 'gt', booking.start_time)

    if (overlaps && overlaps.length > 0) {
      throw new Error('該時段已有核准的預約，無法核准此申請')
    }
  }

  // Approve the booking
  const { error } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'approved' })
    .eq('id', bookingId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/admin/approvals')
  revalidatePath('/dashboard/admin/approver-review')
}

// Get all bookings assigned to current user as approver
export async function getApproverBookings(): Promise<{
  booking: {
    id: string
    start_time: string
    end_time: string
    status: string
    purpose: string | null
    created_at: string
    room: { name: string; room_code: string | null }
    user: {
      full_name: string
      student_id: string | null
      department: { name: string } | null
    }
  }
  step: ApprovalStep
  allSteps: ApprovalStep[]
}[]> {
  const { supabase, user } = await requireAuth()

  // Get steps assigned to current user
  const { data: mySteps, error: stepsError } = await supabase
    .from('booking_approval_steps')
    .select('booking_id, step_order, id, status, label, approver_id, decided_at, comment')
    .eq('approver_id', user.id)
    .order('created_at', { ascending: false })

  if (stepsError || !mySteps || mySteps.length === 0) return []

  const bookingIds = [...new Set(mySteps.map(s => s.booking_id))]

  // Fetch booking details using service client to bypass RLS
  const supabaseAdmin = createServiceClient()
  const { data: bookings, error: bookingsError } = await supabaseAdmin
    .from('bookings')
    .select(`
      id, start_time, end_time, status, purpose, created_at,
      room:rooms (name, room_code),
      user:profiles!bookings_user_id_fkey (
        full_name, student_id,
        department:departments (name)
      )
    `)
    .in('id', bookingIds)
    .order('created_at', { ascending: false })

  if (bookingsError || !bookings) return []

  // Get ALL steps for these bookings (to show full progress)
  const { data: allStepsData } = await supabaseAdmin
    .from('booking_approval_steps')
    .select(`
      id, booking_id, step_order, approver_id, label, status, decided_at, comment,
      approver:profiles!booking_approval_steps_approver_id_fkey (full_name)
    `)
    .in('booking_id', bookingIds)
    .order('step_order')

  // Build result
  type ApproverBookingResult = {
    booking: {
      id: string; start_time: string; end_time: string; status: string;
      purpose: string | null; created_at: string;
      room: { name: string; room_code: string | null };
      user: { full_name: string; student_id: string | null; department: { name: string } | null }
    }
    step: ApprovalStep
    allSteps: ApprovalStep[]
  }

  const result: ApproverBookingResult[] = mySteps.map(step => {
    const booking = bookings.find((b: { id: string }) => b.id === step.booking_id)
    if (!booking) return null
    const stepsForBooking = (allStepsData || []).filter(
      (s: { booking_id: string }) => s.booking_id === step.booking_id
    )
    return {
      booking: booking as unknown as ApproverBookingResult['booking'],
      step: step as unknown as ApprovalStep,
      allSteps: stepsForBooking as unknown as ApprovalStep[],
    }
  }).filter(Boolean) as ApproverBookingResult[]

  return result
}

// Get all users for approver selection (admin only)
export async function getUsersForApproverSelection(): Promise<
  { id: string; full_name: string | null; email: string; user_type: string | null }[]
> {
  await requireAdmin()
  const supabaseAdmin = createServiceClient()

  // Get verified users
  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (usersError) throw usersError

  const verifiedUsers = users.filter(u => u.email_confirmed_at)
  const userIds = verifiedUsers.map(u => u.id)

  // Get profiles (only approved ones)
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, user_type, is_approved')
    .in('id', userIds)
    .eq('is_approved', true)

  const approvedProfiles = profiles || []
  const approvedUserIds = new Set(approvedProfiles.map(p => p.id))

  return verifiedUsers
    .filter(u => approvedUserIds.has(u.id))
    .map(u => {
      const profile = approvedProfiles.find(p => p.id === u.id)
      return {
        id: u.id,
        full_name: profile?.full_name || null,
        email: u.email || '',
        user_type: profile?.user_type || null,
      }
    })
    .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'zh-TW'))
}
