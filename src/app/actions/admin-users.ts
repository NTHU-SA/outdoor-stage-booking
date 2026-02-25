"use server"

import { createServiceClient } from "@/utils/supabase/service"
import { createClient } from "@/utils/supabase/server"
import { Resend } from 'resend'
import { revalidatePath } from "next/cache"

const resend = new Resend(process.env.RESEND_API_KEY)

export type AdminUser = {
  id: string
  email: string
  role: string
  is_approved: boolean
  created_at: string
  last_sign_in_at: string | null
  full_name: string | null
  user_type: string | null
  phone: string | null
}

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
  return user
}

export async function getUsers(): Promise<AdminUser[]> {
  await requireAdmin()
  const supabaseAdmin = createServiceClient()

  // 1. Get all auth users
  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (usersError) throw usersError

  // 1.1 Filter only users who have verified their email
  const verifiedUsers = users.filter(user => user.email_confirmed_at)

  // 2. Get all profiles
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, is_approved, full_name, user_type, phone')
  
  if (profilesError) throw profilesError

  type ProfileRow = {
    id: string
    role: string | null
    is_approved: boolean | null
    full_name: string | null
    user_type: string | null
    phone: string | null
  }

  // 3. Merge data (only for verified users)
  const mergedUsers = verifiedUsers.map(user => {
    const profile = (profiles?.find((p) => p.id === user.id) as ProfileRow | undefined)
    return {
      id: user.id,
      email: user.email || '',
      role: profile?.role || 'user',
      is_approved: profile?.is_approved || false,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at || null,
      full_name: profile?.full_name ?? null,
      user_type: profile?.user_type ?? null,
      phone: profile?.phone ?? null
    }
  })

  return mergedUsers
}

export async function approveUser(userId: string, email: string) {
  await requireAdmin()
  const supabaseAdmin = createServiceClient()

  // Update profile approval status
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ is_approved: true })
    .eq('id', userId)

  if (error) throw error

  // Send notification email
  if (process.env.RESEND_API_KEY) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      await resend.emails.send({
        from: '國立清華大學學生會野台借用系統 <no-reply@will-cheng.com>', // Update this with your verified domain
        to: email,
        subject: '您的帳號已通過審核',
        html: `
          <h2>帳號審核通過通知</h2>
          <p>您好：</p>
          <p>您的野台借用系統帳號已通過管理員審核。</p>
          <p>您現在可以登入系統進行野台借用了。</p>
          <p>
            <a href="${appUrl}/login" style="display: inline-block; padding: 10px 20px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">前往登入</a>
          </p>
          <hr />
          <p style="font-size: 12px; color: #666;">此信件由系統自動發送，請勿回覆。</p>
        `
      })
    } catch (emailError) {
      console.error("Failed to send approval email:", emailError)
      // Don't block approval if email fails
    }
  }

  revalidatePath('/dashboard/admin/users')
}

export async function deleteUser(userId: string) {
  await requireAdmin()
  const supabaseAdmin = createServiceClient()

  // 1. 刪除此使用者相關的業務資料（例如預約紀錄）
  const { error: bookingsError } = await supabaseAdmin
    .from('bookings')
    .delete()
    .eq('user_id', userId)

  if (bookingsError) {
    throw bookingsError
  }

  // 2. 刪除 profile（避免 FK 造成 auth.users 無法刪除）
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (profileError) {
    throw profileError
  }

  // 3. 最後刪除 auth.users 帳號
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (authError) throw authError
  revalidatePath('/dashboard/admin/users')
}

export async function toggleAdminRole(userId: string, currentRole: string) {
  await requireAdmin()
  const supabaseAdmin = createServiceClient()
  
  const newRole = currentRole === 'admin' ? 'user' : 'admin'

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) throw error
  revalidatePath('/dashboard/admin/users')
}

