import { Suspense } from "react"
import { getUserBookings, getRooms } from "@/utils/supabase/queries"
import { Card, CardContent } from "@/components/ui/card"
import { BookingList } from "./booking-list"
import { Skeleton } from "@/components/ui/skeleton"

function TableSkeleton() {
  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-10 w-[100px]" />
      </div>
      <div className="rounded-md border">
        <div className="flex items-center border-b p-4">
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-6 w-1/4 ml-4" />
          <Skeleton className="h-6 w-1/4 ml-4" />
          <Skeleton className="h-6 w-[100px] ml-auto" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center p-4 border-b last:border-0">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-5 w-1/4 ml-4" />
            <Skeleton className="h-5 w-1/4 ml-4" />
            <Skeleton className="h-8 w-[100px] rounded-full ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

async function MyBookingsServer() {
  const bookings = await getUserBookings()
  const rooms = await getRooms()

  return (
    <BookingList
      bookings={bookings}
      rooms={rooms}
    />
  )
}

export default function MyBookingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">我的預約紀錄</h2>
      </div>

      <Card>
        <CardContent>
          <Suspense fallback={<TableSkeleton />}>
            <MyBookingsServer />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
