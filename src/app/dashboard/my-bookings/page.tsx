import { getUserBookings, getRooms } from "@/utils/supabase/queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookingList } from "./booking-list"

export default async function MyBookingsPage() {
  const bookings = await getUserBookings()
  const rooms = await getRooms()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">我的預約紀錄</h2>
      </div>

      <Card>
        <CardContent>
          <BookingList 
            bookings={bookings} 
            rooms={rooms} 
          />
        </CardContent>
      </Card>
    </div>
  )
}
