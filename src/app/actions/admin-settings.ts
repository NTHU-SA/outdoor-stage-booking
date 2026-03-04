"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import type { SemesterSetting } from "@/utils/semester"
import { getMaxBookableMonths, normalizeMaxBookableMonths } from "@/utils/semester"

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

/**
 * Get all semester settings
 */
export async function getSemesterSettings(): Promise<SemesterSetting[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('semester_settings')
    .select('*')
    .order('start_date', { ascending: true })
  
  if (error) {
    console.error('Error fetching semester settings:', error)
    throw error
  }
  
  return data || []
}

/**
 * Get configured max bookable months from semester settings
 */
export async function getMaxBookableMonthsSetting(): Promise<number> {
  const semesters = await getSemesterSettings()
  return getMaxBookableMonths(semesters)
}

/**
 * Update a semester setting (admin only)
 */
export async function updateSemesterSettings(
  id: string,
  updates: {
    semester_name?: string
    start_date?: string
    end_date?: string
    is_next_semester_open?: boolean
  }
) {
  await requireAdmin()
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('semester_settings')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
  
  if (error) {
    console.error('Error updating semester settings:', error)
    throw error
  }
  
  revalidatePath('/dashboard/admin/settings')
  revalidatePath('/dashboard/book')
}

/**
 * Toggle next semester open status (admin only)
 */
export async function toggleNextSemesterOpen(id: string, isOpen: boolean) {
  await requireAdmin()
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('semester_settings')
    .update({
      is_next_semester_open: isOpen,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
  
  if (error) {
    console.error('Error toggling next semester open:', error)
    throw error
  }
  
  revalidatePath('/dashboard/admin/settings')
  revalidatePath('/dashboard/book')
}

/**
 * Create a new semester setting (admin only)
 */
export async function createSemesterSetting(data: {
  semester_name: string
  start_date: string
  end_date: string
  is_next_semester_open?: boolean
}) {
  await requireAdmin()
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('semester_settings')
    .insert({
      semester_name: data.semester_name,
      start_date: data.start_date,
      end_date: data.end_date,
      is_next_semester_open: data.is_next_semester_open || false
    })
  
  if (error) {
    console.error('Error creating semester setting:', error)
    throw error
  }
  
  revalidatePath('/dashboard/admin/settings')
}

/**
 * Delete a semester setting (admin only)
 */
export async function deleteSemesterSetting(id: string) {
  await requireAdmin()
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('semester_settings')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting semester setting:', error)
    throw error
  }
  
  revalidatePath('/dashboard/admin/settings')
}

/**
 * Update max bookable months (admin only)
 * Applies to all semester rows as a global setting.
 */
export async function updateMaxBookableMonths(months: number) {
  await requireAdmin()
  const supabase = await createClient()

  const normalizedMonths = normalizeMaxBookableMonths(months)

  const { data: semesters, error: fetchError } = await supabase
    .from('semester_settings')
    .select('id')

  if (fetchError) {
    console.error('Error fetching semester settings before update:', fetchError)
    throw fetchError
  }

  if (!semesters || semesters.length === 0) {
    throw new Error('找不到學期設定，請先建立學期資料')
  }

  const now = new Date().toISOString()
  const updates = semesters.map((semester) =>
    supabase
      .from('semester_settings')
      .update({
        max_bookable_months: normalizedMonths,
        updated_at: now,
      })
      .eq('id', semester.id)
  )

  const results = await Promise.all(updates)
  const failed = results.find(result => result.error)

  if (failed?.error) {
    console.error('Error updating max bookable months:', failed.error)
    throw failed.error
  }

  revalidatePath('/dashboard/admin/settings')
  revalidatePath('/dashboard/book')
}

