import { getAdminBookings } from "@/utils/supabase/admin-queries"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ActionButtons } from "./action-buttons"
import { ApprovalToolbar } from "./approval-toolbar"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Suspense } from "react"

export default async function AdminApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Server-side admin check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  const params = await searchParams
  const status = (params.status as string) || 'all'
  const search = (params.search as string) || ''

  const bookings = await getAdminBookings({
    status: status as 'pending' | 'approved' | 'rejected' | 'all',
    search: search || undefined,
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">已核准</Badge>
      case 'rejected':
        return <Badge variant="destructive">已拒絕</Badge>
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">待審核</Badge>
      case 'cancelled':
      case 'cancelled_by_user':
        return <Badge variant="outline" className="text-muted-foreground">已取消</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">預約審核</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>預約列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-10" />}>
            <ApprovalToolbar />
          </Suspense>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申請人</TableHead>
                <TableHead>單位/系所</TableHead>
                <TableHead>空間代碼</TableHead>
                <TableHead>空間</TableHead>
                <TableHead>時間</TableHead>
                <TableHead className="w-[300px]">事由</TableHead>
                <TableHead className="w-[100px]">狀態</TableHead>
                <TableHead className="text-right w-[140px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                    目前沒有符合條件的預約
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div className="font-medium">{booking.user.full_name}</div>
                      <div className="text-xs text-muted-foreground">{booking.user.student_id}</div>
                    </TableCell>
                    <TableCell>{booking.user.department?.name || '-'}</TableCell>
                    <TableCell className="font-medium">{booking.room.room_code || '-'}</TableCell>
                    <TableCell>{booking.room.name}</TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {format(new Date(booking.start_time), "MM/dd", { locale: zhTW })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate" title={booking.purpose}>
                      {booking.purpose}
                    </TableCell>
                    <TableCell className="w-[100px]">
                      {getStatusBadge(booking.status)}
                    </TableCell>
                    <TableCell className="text-right w-[140px] pl-2">
                      {booking.status === 'pending' && (
                      <ActionButtons bookingId={booking.id} />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

