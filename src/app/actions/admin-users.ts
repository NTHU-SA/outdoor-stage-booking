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
  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
  if (usersError) throw usersError

  // 1.1 Filter only users who have verified their email
  const verifiedUsers = users.filter(user => user.email_confirmed_at)

  // 2. Get all profiles
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, is_approved')
  
  if (profilesError) throw profilesError

  // 3. Merge data (only for verified users)
  const mergedUsers = verifiedUsers.map(user => {
    const profile = profiles.find(p => p.id === user.id)
    return {
      id: user.id,
      email: user.email || '',
      role: profile?.role || 'user',
      is_approved: profile?.is_approved || false,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at || null,
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
      await resend.emails.send({
        from: '竹師教育學院空間借用系統 <no-reply@will-cheng.com>', // Update this with your verified domain
        to: email,
        subject: '您的帳號已通過審核',
        html: `
          <h2>帳號審核通過通知</h2>
          <p>您好：</p>
          <p>您的空間借用系統帳號已通過管理員審核。</p>
          <p>您現在可以登入系統進行空間借用了。</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '')}" style="display: inline-block; padding: 10px 20px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">前往登入</a>
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

  // Delete from auth.users (cascades to profiles usually, but better to be safe)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  
  if (error) throw error
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

