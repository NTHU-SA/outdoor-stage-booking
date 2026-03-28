"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { Room } from "@/utils/supabase/queries"

// Check if user is admin
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error("Forbidden: Admin access required")
  }
  
  return supabase
}

export async function createRoom(data: Partial<Room>) {
  const supabase = await requireAdmin()
  
  const { error } = await supabase
    .from('rooms')
    .insert({
      name: data.name,
      description: data.description || null,
      unavailable_periods: data.unavailable_periods || [],
      image_url: data.image_url,
      is_active: data.is_active ?? true,
      color: data.color || null,
    })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/admin/rooms')
  revalidatePath('/dashboard/spaces')
  revalidatePath('/dashboard/book')
}

export async function updateRoom(id: string, data: Partial<Room>) {
  const supabase = await requireAdmin()

  const { error } = await supabase
    .from('rooms')
    .update({
      name: data.name,
      description: data.description,
      unavailable_periods: data.unavailable_periods,
      image_url: data.image_url,
      color: data.color,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/admin/rooms')
  revalidatePath('/dashboard/spaces')
  revalidatePath('/dashboard/book')
  revalidatePath(`/dashboard/spaces/${id}`)
}

export async function toggleRoomStatus(id: string, isActive: boolean) {
  const supabase = await requireAdmin()

  const { error } = await supabase
    .from('rooms')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/admin/rooms')
  revalidatePath('/dashboard/spaces')
  revalidatePath('/dashboard/book')
}

export async function uploadRoomImage(formData: FormData): Promise<string> {
  const supabase = await requireAdmin()
  
  const file = formData.get('file') as File
  if (!file) throw new Error("No file provided")

  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}.${fileExt}`
  const filePath = `${fileName}`

  const { error: uploadError } = await supabase
    .storage
    .from('room-images')
    .upload(filePath, file)

  if (uploadError) throw new Error(uploadError.message)

  const { data: { publicUrl } } = supabase
    .storage
    .from('room-images')
    .getPublicUrl(filePath)

  return publicUrl
}

