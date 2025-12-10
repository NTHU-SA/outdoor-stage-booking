import { getUserBookings, getRooms } from "@/utils/supabase/queries"
import { getSemesterSettings } from "@/app/actions/admin-settings"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CancelBookingButton } from "./cancel-button"
import { EditBookingDialog } from "./edit-booking-dialog"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"

export default async function MyBookingsPage() {
  const bookings = await getUserBookings()
  const rooms = await getRooms()
  const semesterSettings = await getSemesterSettings()

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
        <h2 className="text-2xl font-bold tracking-tight">我的預約紀錄</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>預約列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>編號</TableHead>
                <TableHead>名稱</TableHead>
                <TableHead>樓層</TableHead>
                <TableHead>人限</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>時段</TableHead>
                <TableHead>事由</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>申請時間</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground h-24">
                    尚無預約紀錄
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.room.room_code}</TableCell>
                    <TableCell>
                      {booking.room.name}
                    </TableCell>
                    <TableCell>{booking.room.floor}</TableCell>
                    <TableCell>{booking.room.capacity ? `${booking.room.capacity}人` : '-'}</TableCell>
                    <TableCell>
                      {format(new Date(booking.start_time), "PPP", { locale: zhTW })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(booking.start_time), "HH:mm")} -{" "}
                      {format(new Date(booking.end_time), "HH:mm")}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={booking.purpose}>
                      {booking.purpose}
                    </TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(booking.created_at), "yyyy/MM/dd HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {booking.status === 'pending' && (
                          <>
                            <EditBookingDialog 
                              booking={booking} 
                              rooms={rooms}
                              semesterSettings={semesterSettings}
                            >
                              <Button variant="ghost" size="sm" className="h-8">
                                <Pencil className="h-4 w-4 mr-1" />
                                編輯
                              </Button>
                            </EditBookingDialog>
                            <CancelBookingButton bookingId={booking.id} />
                          </>
                        )}
                      </div>
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
