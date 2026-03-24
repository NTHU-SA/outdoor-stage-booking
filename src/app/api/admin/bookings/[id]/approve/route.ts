import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const bookingId = (await params).id
  const supabase = await createClient()
  
  // Admin check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 1. Check for conflicts again before approving (race condition safety)
  // Fetch booking details first
  const { data: booking } = await supabase
    .from('bookings')
    .select('room_id, start_time, end_time')
    .eq('id', bookingId)
    .single()
    
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: overlaps } = await supabase
    .from('bookings')
    .select('id')
    .eq('room_id', booking.room_id)
    .eq('status', 'approved') // Only check approved bookings
    .filter('start_time', 'lt', booking.end_time)
    .filter('end_time', 'gt', booking.start_time)

  if (overlaps && overlaps.length > 0) {
    return NextResponse.json({ error: '該時段已有核准的預約，無法核准此申請' }, { status: 409 })
  }

  // Approve
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'approved' })
    .eq('id', bookingId)

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  return NextResponse.json({ success: true })
}

