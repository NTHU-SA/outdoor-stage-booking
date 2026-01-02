"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export type MaintenanceRequest = {
  id: string
  user_id: string | null
  applicant_name: string
  affiliation: 'student' | 'teacher' | 'staff'
  unit: string
  phone: string
  email: string
  location: string
  occurrence_time: string | null
  description: string
  attachments: string[]
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  admin_notes: string | null
  created_at: string
  updated_at: string
  is_hidden: boolean
}

export type CreateMaintenanceRequestInput = {
  applicant_name: string
  affiliation: 'student' | 'teacher' | 'staff'
  unit: string
  phone: string
  email: string
  location: string
  occurrence_time?: string
  description: string
  attachments?: string[]
}

// Create a new maintenance request
export async function createMaintenanceRequest(data: CreateMaintenanceRequestInput) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error("請先登入")
  }

  const { error } = await supabase
    .from('maintenance_requests')
    .insert({
      user_id: user.id,
      applicant_name: data.applicant_name,
      affiliation: data.affiliation,
      unit: data.unit,
      phone: data.phone,
      email: data.email,
      location: data.location,
      occurrence_time: data.occurrence_time || null,
      description: data.description,
      attachments: data.attachments || [],
    })

  if (error) {
    console.error('Error creating maintenance request:', error)
    throw new Error("提交失敗，請稍後再試")
  }

  revalidatePath('/dashboard/report')
  revalidatePath('/dashboard/admin/reports')
}

// Upload file for maintenance request
export async function uploadMaintenanceFile(formData: FormData): Promise<string> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error("請先登入")
  }

  const file = formData.get('file') as File
  if (!file) {
    throw new Error("請選擇檔案")
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

  const { error } = await supabase.storage
    .from('maintenance-files')
    .upload(fileName, file)

  if (error) {
    console.error('Error uploading file:', error)
    throw new Error("檔案上傳失敗")
  }

  const { data: { publicUrl } } = supabase.storage
    .from('maintenance-files')
    .getPublicUrl(fileName)

  return publicUrl
}

// Get all maintenance requests (admin only)
export async function getMaintenanceRequests(status?: string): Promise<MaintenanceRequest[]> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return []
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return []
  }

  let query = supabase
    .from('maintenance_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching maintenance requests:', error)
    return []
  }

  return data as MaintenanceRequest[]
}

// Get user's own maintenance requests
export async function getUserMaintenanceRequests(): Promise<MaintenanceRequest[]> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('maintenance_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user maintenance requests:', error)
    return []
  }

  return data as MaintenanceRequest[]
}

// Update maintenance request status (admin only)
export async function updateMaintenanceStatus(
  id: string, 
  status: 'pending' | 'processing' | 'completed' | 'rejected',
  adminNotes?: string,
  isHidden?: boolean
) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error("請先登入")
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error("權限不足")
  }

  const updateData: { status: string; admin_notes?: string; is_hidden?: boolean } = { status }
  if (adminNotes !== undefined) {
    updateData.admin_notes = adminNotes
  }
  if (isHidden !== undefined) {
    updateData.is_hidden = isHidden
  }

  const { error } = await supabase
    .from('maintenance_requests')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Error updating maintenance request:', error)
    throw new Error("更新失敗")
  }

  revalidatePath('/dashboard/admin/reports')
  revalidatePath('/dashboard/report/records')
}

// Get single maintenance request by ID
export async function getMaintenanceRequestById(id: string): Promise<MaintenanceRequest | null> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('maintenance_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching maintenance request:', error)
    return null
  }

  return data as MaintenanceRequest
}

