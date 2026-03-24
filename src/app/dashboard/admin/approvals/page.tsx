import { getAdminBookings } from "@/utils/supabase/admin-queries"
import { Card, CardContent } from "@/components/ui/card"
import { AdminApprovalsClient } from "./admin-approvals-client"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import type { Booking as BookingListItem } from "./booking-list"

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
          <Skeleton className="h-6 w-[100px] ml-auto" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center p-4 border-b last:border-0">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-5 w-1/4 ml-4" />
            <Skeleton className="h-8 w-[100px] rounded-full ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

async function AdminApprovalsServer({ status, search }: { status: string, search: string }) {
  const bookings = await getAdminBookings({
    status: status as 'pending' | 'approved' | 'rejected' | 'all',
    search: search || undefined,
  })

  return <AdminApprovalsClient initialBookings={bookings as unknown as BookingListItem[]} />
}

export default async function AdminApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Server-side admin check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const params = await searchParams
  const status = (params.status as string) || 'all'
  const search = (params.search as string) || ''

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">預約管理</h2>
      </div>

      <Card>
        <CardContent>
          <Suspense fallback={<TableSkeleton />}>
            <AdminApprovalsServer status={status} search={search} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
