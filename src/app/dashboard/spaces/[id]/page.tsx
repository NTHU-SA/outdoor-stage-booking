import { getRoomById } from "@/utils/supabase/queries"
import { notFound } from "next/navigation"
import { SpaceBookingClient } from "./space-booking-client"
import { createClient } from "@/utils/supabase/server"
import type { SemesterSetting } from "@/utils/semester"

export default async function SpaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const room = await getRoomById(id)

  if (!room) {
    notFound()
  }

  const supabase = await createClient()
  
  // Fetch semester settings
  const { data: semesterData } = await supabase
    .from('semester_settings')
    .select('*')
    .order('start_date', { ascending: true })
  
  const semesters: SemesterSetting[] = semesterData as SemesterSetting[] || []

  // Check if user is admin
  let isAdmin = false
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role === 'admin') {
      isAdmin = true
    }
  }

  // Redirect if room is inactive and user is not admin
  if (room.is_active === false && !isAdmin) {
    notFound()
  }

  return (
    <SpaceBookingClient 
      room={room} 
      semesters={semesters} 
      isAdmin={isAdmin} 
    />
  )
}
